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
import { convertInchesToTwip } from "@util/convenience-functions";
import type * as mdast from "mdast";

export type ImageDataMap = { [url: string]: ImageData };

const BLOCKQUOTE_INDENT = 0.5;

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
        case "break":
          results.push(this.buildBreak());
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
              indent: deco.indent && deco.indent > 0
                ? { left: convertInchesToTwip(BLOCKQUOTE_INDENT * deco.indent) }
                : undefined
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
          // It is processed within buildList  
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
          const imageResult = this.buildImageReference(node, definitions, images);  
          if (imageResult) {  
            results.push(imageResult);  
          }  
          break;  
        }  
        case "table": {  
          const tableResult = this.buildTable(node, deco, images, definitions);  
          results.push(tableResult);  
          break;  
        }  
        case "tableRow": {  
          // It is processed within buildTable
          break;  
        }  
        case "tableCell": {  
          // It is processed within buildTableRow  
          break;  
        }  
        case "thematicBreak": {
          results.push(this.buildThematicBreak());
          break;
        }
        default:  
          // For unimplemented nodes, we simply ignore them  
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
  
    const timestamp = Date.now();  
    const randomId = Math.random().toString(36).substr(2, 9);  
    const listUniqueId = `md-${listType}-${level}-${timestamp}-${randomId}`;  
  
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
  ): ParagraphChild {
    const textRuns = this.convertNodes(children, deco, null, images, definitions);

    if (textRuns.length === 0) {
      return new TextRun({ text: url });
    }

    // ImageRun IS supported inside ExternalHyperlink
    // The docx library generates valid OOXML: w:hyperlink > w:r > w:drawing
    // See demo/35-hyperlinks.ts for official example
    const hyperlink = new ExternalHyperlink({
      children: textRuns as ParagraphChild[],
      link: url
    });

    return hyperlink;
  }

  private buildImage(
    { url, alt }: mdast.Image,
    images: ImageDataMap
  ): ImageRun {
    const img = images[url];
    const { image, width, height, type } = img!;
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

  private buildImageReference(  
    { identifier, alt }: mdast.ImageReference,  
    definitions: Record<string, string>,  
    images: ImageDataMap  
  ): ImageRun {  
    const url = definitions[identifier];
    const img = images[url!];  
    const { image, width, height, type } = img!;  
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

  private buildThematicBreak(): Paragraph {
    return new Paragraph({
      thematicBreak: true,
    });
  }

  private buildBreak(): TextRun {
    return new TextRun({ text: "", break: 1 });
  }
  
  getListConfigurations(): Map<string, { listType: string; level: number }> {  
    return new Map(this.listConfigurations);  
  }  
}