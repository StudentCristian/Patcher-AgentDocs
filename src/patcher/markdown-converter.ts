import { unified } from "unified";  
import markdown from "remark-parse";  
import gfm from "remark-gfm";  
import { TextRun } from "@file/paragraph/run/text-run";  
import { ImageRun } from "@file/paragraph/run/image-run"; 
import { ParagraphChild } from "@file/paragraph/paragraph";  
import { Paragraph } from "@file/paragraph/paragraph";  
import { HeadingLevel } from "@file/paragraph/formatting";  
import { CheckBox } from "@file/checkbox/checkbox";  
import { ExternalHyperlink } from "@file/paragraph/links/hyperlink";  
import { Table, TableRow, TableCell, WidthType } from "@file/table";  
import { AlignmentType } from "@file/paragraph";  
import type * as mdast from "mdast";  
import { uniqueId } from "@util/convenience-functions";
  
export type ImageDataMap = { [url: string]: ImageData };  
  
export type ImageData = {  
  image: Buffer | Uint8Array | string;  
  width: number;  
  height: number;  
  type: "jpg" | "png" | "gif" | "bmp"; 
};  
  
interface Decoration {  
  emphasis?: boolean;  
  strong?: boolean;  
  delete?: boolean;
  indent?: number;  
}  
  
interface ListContext {  
  level: number;  
  ordered: boolean;  
  reference: string;  
  checked?: boolean;  
}  

export class MarkdownConverter {  
  private processor = unified()  
    .use(markdown)  
    .use(gfm);  
      
  private listConfigurations = new Map<string, { listType: string; level: number }>();  
  
  async convertMarkdownToDocx(    
    markdownText: string,     
    images: ImageDataMap = {}    
  ): Promise<(ParagraphChild | Paragraph | Table)[]> {    
    const tree = this.processor.parse(markdownText);    
    this.listConfigurations.clear();    
        
    const definitions: Record<string, string> = {};    
    this.collectDefinitions(tree, definitions);    
        
    const content = this.convertNodes(  
      (tree as mdast.Root).children,   
      {},   
      null,   
      images,   
      definitions  
    );  
      
    return content;  
  }
  
  private collectDefinitions(node: any, definitions: Record<string, string>): void {  
    if (node.type === 'definition') {  
      console.log(`Found definition: ${node.identifier} -> ${node.url}`);
      definitions[node.identifier] = node.url;  
    }  
    if (node.children) {  
      node.children.forEach((child: any) => this.collectDefinitions(child, definitions));  
    }  
  }  
  
  private convertNodes(  
    nodes: mdast.Content[],   
    deco: Decoration,   
    listContext: ListContext | null,  
    images: ImageDataMap = {},  
    definitions: Record<string, string> = {}
  ): (ParagraphChild | Paragraph | Table)[] {  
    const results: (ParagraphChild | Paragraph | Table)[] = [];  
      
    for (const node of nodes) {
      switch (node.type) {  
        case "text":  
          results.push(this.buildText(node.value, deco));  
          break;  
        case "emphasis":  
        case "strong":  
        case "delete": {  
          const { type, children } = node;  
          const childNodes = this.convertNodes(children, {  
            ...deco,  
            [type]: true,  
          }, listContext, images, definitions);  
          results.push(...childNodes);  
          break;  
        }  
        case "paragraph": {  
          if (listContext) {  
            const textRuns = this.convertNodes(node.children, deco, null, images, definitions) as ParagraphChild[];  
              
            const paragraphChildren: ParagraphChild[] = [];  
            if (listContext.checked !== null && listContext.checked !== undefined) {  
              paragraphChildren.push(new CheckBox({ checked: listContext.checked }));  
              paragraphChildren.push(new TextRun(" "));  
            }  
            paragraphChildren.push(...textRuns);  
              
            const paragraph = new Paragraph({  
              children: paragraphChildren,  
              numbering: {  
                reference: listContext.reference,  
                level: listContext.level,  
                instance: 0  
              }  
            });  
            results.push(paragraph);  
          } else {  
            const childNodes = this.convertNodes(node.children, deco, null, images, definitions);  
            const paragraph = new Paragraph({  
              children: childNodes as ParagraphChild[],
              indent: deco.indent ? { start: 720 * deco.indent } : undefined,
            });  
            results.push(paragraph);  
          }  
          break;  
        }
        case "heading": {  
          const headingResult = this.buildHeading(node, deco, images, definitions);  
          results.push(headingResult);  
          break;  
        }
        case "blockquote": {
          const blockquoteResults = this.convertNodes(
            (node as mdast.Blockquote).children,
            { ...deco, indent: (deco.indent || 0) + 1 },
            listContext,
            images,
            definitions
          );
          results.push(...blockquoteResults);
          break;
        }  
        case "list": {  
          const listResults = this.buildList(node, deco, listContext, images, definitions);  
          results.push(...listResults);  
          break;  
        }  
        case "listItem": {  
          // Se procesa dentro de buildList  
          break;  
        }  
        case "link": {  
          const linkResult = this.buildLink(node, deco, images, definitions);  
          results.push(linkResult);  
          break;  
        }  
        case "image": {  
          const imageResult = this.buildImage(node, images);  
          if (imageResult) {  
            results.push(imageResult);  
          }  
          break;  
        }  
        case "imageReference": {  
          console.log(`Processing imageReference: ${node.identifier}`);
          const imageResult = this.buildImageReference(node, definitions, images);  
          if (imageResult) { 
            console.log(`ImageReference resolved successfully`);  
            results.push(imageResult);  
          }  
          else {  
          console.log(`ImageReference failed to resolve`);
        }  
          break;  
        }  
        case "table": {  
          const tableResult = this.buildTable(node, deco, images, definitions);  
          results.push(tableResult);  
          break;  
        }  
        case "tableRow": {  
          // Se procesa dentro de buildTable  
          break;  
        }  
        case "tableCell": {  
          // Se procesa dentro de buildTableRow  
          break;  
        }  
        default:  
          // Para nodos no implementados, simplemente los ignoramos  
          break;  
      }  
    }  
      
    return results;  
  }  
  
  private buildHeading(  
    { children, depth }: mdast.Heading,  
    deco: Decoration,  
    images: ImageDataMap,  
    definitions: Record<string, string>  
  ): Paragraph {  
    let headingLevel: typeof HeadingLevel[keyof typeof HeadingLevel];  
    switch (depth) {  
      case 1:  
        headingLevel = HeadingLevel.HEADING_1;  
        break;  
      case 2:  
        headingLevel = HeadingLevel.HEADING_2;  
        break;  
      case 3:  
        headingLevel = HeadingLevel.HEADING_3;  
        break;  
      case 4:  
        headingLevel = HeadingLevel.HEADING_4;  
        break;  
      case 5:  
        headingLevel = HeadingLevel.HEADING_5;  
        break;  
      case 6:  
        headingLevel = HeadingLevel.HEADING_6;  
        break;  
      default:  
        headingLevel = HeadingLevel.HEADING_1;  
    }  
      
    const textRuns = this.convertNodes(children, deco, null, images, definitions) as ParagraphChild[];
    return new Paragraph({  
      heading: headingLevel,  
      children: textRuns,  
    });  
  }  
  
  private buildList(  
    { children, ordered }: mdast.List,   
    deco: Decoration,   
    parentContext: ListContext | null,  
    images: ImageDataMap,  
    definitions: Record<string, string>
  ): Paragraph[] {  
    const listType = ordered ? "numbered" : "bullet";  
    const level = parentContext ? parentContext.level + 1 : 0;  
      
    const listContentHash = this.hashListContent(children, listType, level);
    const listUniqueId = `md-${listType}-${level}-${listContentHash}`;  
      
    this.listConfigurations.set(listUniqueId, {  
      listType,  
      level  
    });  
      
    const listContext: ListContext = {  
      level,  
      ordered: !!ordered,  
      reference: listUniqueId  
    };  
  
    return children.flatMap(item => this.buildListItem(item, deco, listContext, images, definitions));  
  }  
  
  private buildListItem(  
    { children, checked }: mdast.ListItem,   
    deco: Decoration,   
    listContext: ListContext,  
    images: ImageDataMap,  
    definitions: Record<string, string>
  ): Paragraph[] {  
    const paragraphs: Paragraph[] = [];  
      
    for (const child of children) {  
      if (child.type === 'paragraph') {  
        const textRuns = this.convertNodes(child.children, deco, null, images, definitions) as ParagraphChild[];  
  
        const paragraphChildren: ParagraphChild[] = [];  
        if (checked !== null && checked !== undefined) {  
          paragraphChildren.push(new CheckBox({ checked }));  
          paragraphChildren.push(new TextRun(" "));  
        }  
        paragraphChildren.push(...textRuns);  
          
        paragraphs.push(new Paragraph({  
          children: paragraphChildren,  
          numbering: {  
            reference: listContext.reference,  
            level: listContext.level,  
            instance: 0  
          }  
        }));  
      } else if (child.type === 'list') {  
        const nestedList = this.buildList(child, deco, listContext, images, definitions);  
        paragraphs.push(...nestedList);  
      }  
    }  
      
    return paragraphs;  
  }  
  
  private buildText(text: string, deco: Decoration): TextRun {  
    return new TextRun({  
      text,  
      bold: deco.strong,  
      italics: deco.emphasis,  
      strike: deco.delete,  
    });  
  }  
  
  private buildLink(          
    { children, url }: mdast.Link,          
    deco: Decoration,          
    images: ImageDataMap,          
    definitions: Record<string, string>        
  ): ExternalHyperlink {          
    const textRuns = this.convertNodes(children, deco, null, images, definitions) as ParagraphChild[];        
      
    const linkId = `rId${uniqueId()}`;  
    const hyperlink = new ExternalHyperlink({          
      children: textRuns,          
      link: url          
    });        
    (hyperlink as any).preAssignedId = linkId;      
          
    return hyperlink;        
  }
    
  private buildImage(  
    { url, alt }: mdast.Image,  
    images: ImageDataMap  
  ): ImageRun | undefined {  
    const img = images[url];  
    if (!img) {  
      console.warn(`Image not found: ${url}`);  
      return undefined;  
    }  
  
    const { image, width, height, type } = img;  
    return new ImageRun({  
      type, // Propiedad requerida para imágenes regulares  
      data: image,  
      transformation: {  
        width,  
        height,  
      },  
      altText: {  
        title: alt || "Image",  
        description: alt || "Image",  
        name: alt || "Image"  
      }  
    });  
  }  
  
  private buildImageReference(  
    { identifier, alt }: mdast.ImageReference,  
    definitions: Record<string, string>,  
    images: ImageDataMap  
  ): ImageRun | undefined {  
    const url = definitions[identifier];  
    if (!url) {  
      console.warn(`Image reference not found: ${identifier}`);  
      return undefined;  
    }  

    const img = images[url];  
    if (!img) {  
      console.warn(`Image not found: ${url}`);  
      return undefined;  
    }  
    
    const { image, width, height, type } = img;  
    return new ImageRun({  
      type,  
      data: image,  
      transformation: {  
        width,  
        height,  
      },  
      altText: {  
        title: alt || "Image",  
        description: alt || "Image",   
        name: alt || "Image"  
      }  
    });  
  }
  
  private buildTable(  
    { children, align }: mdast.Table,  
    deco: Decoration,  
    images: ImageDataMap,  
    definitions: Record<string, string>
  ): Table {  
    const cellAligns: (typeof AlignmentType[keyof typeof AlignmentType])[] | undefined = align?.map((a) => {  
      switch (a) {  
        case "left":  
          return AlignmentType.LEFT;  
        case "right":  
          return AlignmentType.RIGHT;  
        case "center":  
          return AlignmentType.CENTER;  
        default:  
          return AlignmentType.LEFT;  
      }  
    });  
  
    return new Table({  
      rows: children.map((r) => {  
        return this.buildTableRow(r, deco, cellAligns, images, definitions);  
      }),  
      width: {  
        size: 100,  
        type: WidthType.PERCENTAGE,  
      },  
    });  
  }  
  
  private buildTableRow(  
    { children }: mdast.TableRow,  
    deco: Decoration,  
    cellAligns: (typeof AlignmentType[keyof typeof AlignmentType])[] | undefined,  
    images: ImageDataMap,  
    definitions: Record<string, string>
  ): TableRow {  
    return new TableRow({
      children: children.map((c, i) => {
        return this.buildTableCell(c, deco, cellAligns?.[i], images, definitions);
      }),
    });
  }

  private buildTableCell(
    { children }: mdast.TableCell,  
    deco: Decoration,  
    align: typeof AlignmentType[keyof typeof AlignmentType] | undefined,  
    images: ImageDataMap,  
    definitions: Record<string, string>
  ): TableCell {
    const nodes = this.convertNodes(children, deco, null, images, definitions);
    return new TableCell({
      children: [
        new Paragraph({
          alignment: align,
          children: nodes as ParagraphChild[],
        }),  
      ],  
    });  
  }  

  private hashListContent(children: mdast.ListItem[], listType: string, level: number): string {
    const content = JSON.stringify({
      listType,
      level,
      items: children.map(item => ({
        checked: item.checked,
        content: this.extractTextContent(item.children)
      }))
    });
    
    // Hash simple de 32-bit
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private extractTextContent(nodes: mdast.Content[]): string {
    return nodes.map(node => {
      if (node.type === 'text') return (node as mdast.Text).value;
      if ('children' in node && Array.isArray(node.children)) {
        return this.extractTextContent(node.children as mdast.Content[]);
      }
      return '';
    }).join('');
  }

  getListConfigurations(): Map<string, { listType: string; level: number }> {  
    return new Map(this.listConfigurations);  
  }  
}