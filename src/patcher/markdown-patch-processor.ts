import { IPatch, PatchType } from "./from-docx";    
import { Paragraph } from "@file/paragraph/paragraph";    
import { ParagraphChild } from "@file/paragraph/paragraph";    
import { FileChild } from "@file/file-child";    
import { Table } from "@file/table";    
import { MarkdownConverter, ImageDataMap, ImageData } from "./markdown-converter";  
import { visit } from "unist-util-visit";  
import type * as mdast from "mdast";  
  
export interface MarkdownPatch {    
  type: typeof PatchType.PARAGRAPH | typeof PatchType.DOCUMENT;    
  markdownContent: string;  
  imageResolver?: (url: string) => Promise<ImageData>; 
}    
    
export class MarkdownPatchProcessor {    
  private converter = new MarkdownConverter();    
    
  async processMarkdownPatch(markdownPatch: MarkdownPatch, _patchKey?: string): Promise<IPatch> {        
    const { type, markdownContent, imageResolver } = markdownPatch;        
            
    // Resolver imágenes si hay imageResolver      
    const images: ImageDataMap = {};      
    if (imageResolver) {      
      await this.resolveImages(markdownContent, imageResolver, images);      
    }      
      
    const content = await this.converter.convertMarkdownToDocx(markdownContent, images);  
      
    switch (type) {        
      case PatchType.PARAGRAPH: {        
        const paragraphChildren = content.filter((child: any) => !(child instanceof Paragraph) && !(child instanceof Table)) as ParagraphChild[];        
        return {        
          type: PatchType.PARAGRAPH,        
          children: paragraphChildren as readonly ParagraphChild[]  
        };        
      }        
              
      case PatchType.DOCUMENT: {        
        const fileChildren: FileChild[] = [];        
        let currentRuns: ParagraphChild[] = [];        
                
        for (const child of content) {       
          if (child instanceof Paragraph || child instanceof Table) {        
            if (currentRuns.length > 0) {        
              fileChildren.push(new Paragraph({ children: currentRuns }));        
              currentRuns = [];        
            }        
            fileChildren.push(child);        
          } else {        
            currentRuns.push(child as ParagraphChild);        
          }        
        }        
                
        if (currentRuns.length > 0) {        
          fileChildren.push(new Paragraph({ children: currentRuns }));        
        }        
                
        return {        
          type: PatchType.DOCUMENT,        
          children: fileChildren as readonly FileChild[]  
        };        
      }        
              
      default:        
        throw new Error(`Unsupported patch type: ${type}`);        
    }        
  }  
    
  private async resolveImages(      
    markdownContent: string,       
    imageResolver: (url: string) => Promise<ImageData>,       
    images: ImageDataMap      
  ): Promise<void> {      
    // Parsear el markdown para encontrar imágenes      
    const tree = this.converter['processor'].parse(markdownContent);          
      
    // Recopilar definiciones de imagen      
    const definitions = new Map<string, string>();      
    visit(tree as mdast.Root, "definition", (node: mdast.Definition) => {      
      definitions.set(node.identifier, node.url);      
    });      
    
    // Recopilar todas las URLs de imágenes      
    const imageUrls = new Set<string>();          
      
    // Imágenes directas (visit busca recursivamente en todos los nodos)
    visit(tree as mdast.Root, "image", (node: mdast.Image) => {      
      imageUrls.add(node.url);      
    });          
      
    // Referencias de imágenes      
    visit(tree as mdast.Root, "imageReference", (node: mdast.ImageReference) => {      
      const url = definitions.get(node.identifier);      
      if (url) {      
        imageUrls.add(url);      
      }      
    });      
    
    // Resolver TODAS las imágenes - enfoque fail-fast como remark-docx  
    const promises = Array.from(imageUrls).map(async (url) => {      
      const imageData = await imageResolver(url);      
      return { url, imageData };      
    });      
    
    // Si alguna imagen falla, Promise.all lanzará el error  
    const results = await Promise.all(promises);    
    results.forEach((result) => {      
      images[result.url] = result.imageData;      
    });
  }   
      
  async processMarkdownPatches(      
    markdownPatches: Record<string, MarkdownPatch>      
  ): Promise<Record<string, IPatch>> {      
    const patches: Record<string, IPatch> = {};      
          
    for (const [key, markdownPatch] of Object.entries(markdownPatches)) {      
      patches[key] = await this.processMarkdownPatch(markdownPatch, key);
    }      
          
    return patches;      
  }      
}