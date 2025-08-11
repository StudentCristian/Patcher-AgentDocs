// demo/102-test-style-interceptor.ts  / npm run run-ts -- ./demo/102-test-style-interceptor.ts
import * as fs from "fs";
import { Paragraph, HeadingLevel, TextRun, patchDocument, PatchType } from "docx";

async function testStyleInterceptor() {
    const result = await patchDocument({
        outputType: "nodebuffer",
        data: fs.readFileSync("demo/assets/doc_espanol.docx"),
        patches: {
            title: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        text: "Título Principal",
                        heading: HeadingLevel.TITLE,
                    }),
                ],
            },
            heading1: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        text: "Encabezado Nivel 1",
                        heading: HeadingLevel.HEADING_1,
                    }),
                ],
            },
            heading2: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        text: "Encabezado Nivel 2",
                        heading: HeadingLevel.HEADING_2,
                    }),
                ],
            },
            heading3: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        text: "Encabezado Nivel 3",
                        heading: HeadingLevel.HEADING_3,
                    }),
                ],
            },
            heading4: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        text: "Encabezado Nivel 4",
                        heading: HeadingLevel.HEADING_4,
                    }),
                ],
            },
            heading5: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        text: "Encabezado Nivel 5",
                        heading: HeadingLevel.HEADING_5,
                    }),
                ],
            },
            heading6: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        text: "Encabezado Nivel 6",
                        heading: HeadingLevel.HEADING_6,
                    }),
                ],
            },
            // Ejemplo de párrafo con énfasis
            paragraph_emphasis: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Texto en negrita",
                                bold: true,
                            }),
                            new TextRun({
                                text: " y cursiva",
                                italics: true,
                            }),
                            new TextRun({
                                text: " y subrayado.",
                                underline: {},
                            }),
                        ],
                    }),
                ],
            },
        },
    });

    if (!fs.existsSync("output")) {
        fs.mkdirSync("output");
    }

    fs.writeFileSync("output/style-es.docx", result);
    console.log("Prueba de interceptor completada");
}

testStyleInterceptor().catch(console.error);