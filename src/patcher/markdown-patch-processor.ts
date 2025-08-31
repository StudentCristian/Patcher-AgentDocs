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
  imageResolver?: (url: string) => Promise<ImageData>; // Agregar esta propiedad  
}    
    
export class MarkdownPatchProcessor {    
  private converter = new MarkdownConverter();    
    
  async processMarkdownPatch(markdownPatch: MarkdownPatch): Promise<IPatch> {    
    const { type, markdownContent, imageResolver } = markdownPatch;    
        
    // Resolver imágenes si hay imageResolver  
    const images: ImageDataMap = {};  
    if (imageResolver) {  
      await this.resolveImages(markdownContent, imageResolver, images);  
    }  
  
    switch (type) {    
      case PatchType.PARAGRAPH: {    
        const children = await this.converter.convertMarkdownToDocx(markdownContent, images);    
        const paragraphChildren = children.filter(child => !(child instanceof Paragraph) && !(child instanceof Table)) as ParagraphChild[];    
        return {    
          type: PatchType.PARAGRAPH,    
          children: paragraphChildren as readonly ParagraphChild[],    
        };    
      }    
          
      case PatchType.DOCUMENT: {    
        const children = await this.converter.convertMarkdownToDocx(markdownContent, images);    
        const fileChildren: FileChild[] = [];    
        let currentRuns: ParagraphChild[] = [];    
            
        for (const child of children) {    
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
          children: fileChildren as readonly FileChild[],    
        };    
      }    
          
      default:    
        throw new Error(`Tipo de patch no soportado: ${type}`);    
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
      
    // Imágenes directas  
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
  
    // Resolver todas las imágenes  
    const promises = Array.from(imageUrls).map(async (url) => {  
      try {  
        const imageData = await imageResolver(url);  
        return { url, imageData };  
      } catch (error) {  
        console.warn(`Failed to resolve image: ${url}`, error);  
        return null;  
      }  
    });  
  
    const results = await Promise.all(promises);  
    results.forEach((result) => {  
      if (result) {  
        images[result.url] = result.imageData;  
      }  
    });  
  }  
    
  async processMarkdownPatches(    
    markdownPatches: Record<string, MarkdownPatch>    
  ): Promise<Record<string, IPatch>> {    
    const patches: Record<string, IPatch> = {};    
        
    for (const [key, markdownPatch] of Object.entries(markdownPatches)) {    
      patches[key] = await this.processMarkdownPatch(markdownPatch);    
    }    
        
    return patches;    
  }    
}