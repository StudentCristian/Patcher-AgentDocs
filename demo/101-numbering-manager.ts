import * as fs from "fs";  
import { Paragraph, patchDocument, PatchType, TextRun, CheckBox } from "docx";  
  
patchDocument({  
    outputType: "nodebuffer",  
    data: fs.readFileSync("demo/assets/example.docx"),  
    patches: {  
        // Prueba 1: Lista simple numerada  
        simple_numbered: {  
            type: PatchType.DOCUMENT,  
            children: [  
                new Paragraph({   
                    children: [new TextRun("Primer elemento numerado")],  
                    numbering: {  
                        reference: "numbered-list-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("Segundo elemento numerado")],  
                    numbering: {  
                        reference: "numbered-list-ref",   
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("Tercer elemento numerado")],  
                    numbering: {  
                        reference: "numbered-list-ref",  
                        level: 0,   
                        instance: 0  
                    }  
                })  
            ]  
        },  
  
        // Prueba 2: Lista simple con viñetas  
        simple_bullets: {  
            type: PatchType.DOCUMENT,  
            children: [  
                new Paragraph({   
                    children: [new TextRun("Primera viñeta")],  
                    numbering: {  
                        reference: "bullet-list-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("Segunda viñeta")],  
                    numbering: {  
                        reference: "bullet-list-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("Tercera viñeta")],  
                    numbering: {  
                        reference: "bullet-list-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                })  
            ]  
        },  
  
        // Prueba 3: Lista anidada con viñetas multinivel  
        nested_bullets: {  
            type: PatchType.DOCUMENT,  
            children: [  
                new Paragraph({   
                    children: [new TextRun("Punto principal nivel 0 (●)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("Sub punto nivel 1 (○)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 1,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("Sub-sub punto nivel 2 (■)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 2,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("Otro sub punto nivel 1 (○)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 1,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("De vuelta al nivel principal (●)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                })  
            ]  
        },  
  
        // Prueba 4: Lista anidada numerada multinivel  
        nested_numbered: {  
            type: PatchType.DOCUMENT,  
            children: [  
                new Paragraph({   
                    children: [new TextRun("1. Primer elemento principal")],  
                    numbering: {  
                        reference: "numbered-nested-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("1.1. Sub elemento numerado")],  
                    numbering: {  
                        reference: "numbered-nested-ref",  
                        level: 1,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("1.1.1. Sub-sub elemento numerado")],  
                    numbering: {  
                        reference: "numbered-nested-ref",  
                        level: 2,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("1.2. Otro sub elemento")],  
                    numbering: {  
                        reference: "numbered-nested-ref",  
                        level: 1,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [new TextRun("2. Segundo elemento principal")],  
                    numbering: {  
                        reference: "numbered-nested-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                })  
            ]  
        },  
  
        // Prueba 5: Lista mixta con formato complejo  
        complex_formatting: {  
            type: PatchType.DOCUMENT,  
            children: [  
                new Paragraph({   
                    children: [  
                        new TextRun("Elemento con "),  
                        new TextRun({ text: "texto en negrita", bold: true }),  
                        new TextRun(" y texto normal")  
                    ],  
                    numbering: {  
                        reference: "mixed-format-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({   
                    children: [  
                        new TextRun({ text: "Elemento completamente en cursiva", italics: true })  
                    ],  
                    numbering: {  
                        reference: "mixed-format-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                })  
            ]  
        }, 
        // Prueba 6: Lista de checkbox REAL (interactiva)  
        checkbox_list: {  
            type: PatchType.DOCUMENT,  
            children: [  
                new Paragraph({  
                    children: [  
                        new CheckBox({ checked: true }),  
                        new TextRun(" Tarea completada")  
                    ]  
                }),  
                new Paragraph({  
                    children: [  
                        new CheckBox({ checked: false }),  
                        new TextRun(" Tarea pendiente")  
                    ]  
                }),  
                new Paragraph({  
                    children: [  
                        new CheckBox({ checked: true }),  
                        new TextRun(" Otra tarea completada")  
                    ]  
                })  
            ]  
        }
    }  
}).then((doc) => {  
    fs.writeFileSync("Numbering Manager Test.docx", doc);  
    console.log("✅ Documento de prueba creado exitosamente!"); 
});