import { IPatch, PatchType } from "./from-docx";  
import { Paragraph } from "@file/paragraph/paragraph";  
import { ParagraphChild } from "@file/paragraph/paragraph";  
import { FileChild } from "@file/file-child";  
import { Table } from "@file/table";  
import { MarkdownConverter } from "./markdown-converter";  
  
export interface MarkdownPatch {  
  type: typeof PatchType.PARAGRAPH | typeof PatchType.DOCUMENT;  
  markdownContent: string;  
}  
  
export class MarkdownPatchProcessor {  
  private converter = new MarkdownConverter();  
  
  async processMarkdownPatch(markdownPatch: MarkdownPatch): Promise<IPatch> {  
    const { type, markdownContent } = markdownPatch;  
      
    switch (type) {  
      case PatchType.PARAGRAPH: {  
        const children = await this.converter.convertMarkdownToDocx(markdownContent);  
        const paragraphChildren = children.filter(child => !(child instanceof Paragraph) && !(child instanceof Table)) as ParagraphChild[];  
        return {  
          type: PatchType.PARAGRAPH,  
          children: paragraphChildren as readonly ParagraphChild[],  
        };  
      }  
        
      case PatchType.DOCUMENT: {  
        const children = await this.converter.convertMarkdownToDocx(markdownContent);  
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