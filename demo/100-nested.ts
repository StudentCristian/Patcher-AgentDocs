import * as fs from "fs";    
import { Paragraph, patchDocument, PatchType, TextRun } from "docx";    
    
patchDocument({    
    outputType: "nodebuffer",    
    data: fs.readFileSync("demo/assets/template-nested.docx"),    
    patches: {    
        bullet_example: {    
            type: PatchType.DOCUMENT,    
            children: [    
                new Paragraph({   
                    children: [new TextRun("First bullet point")],  
                    numbering: {  
                        reference: "bullet-list-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),    
                new Paragraph({   
                    children: [new TextRun("Second bullet point")],  
                    numbering: {  
                        reference: "bullet-list-ref",   
                        level: 0,  
                        instance: 0  
                    }  
                }),    
                new Paragraph({   
                    children: [new TextRun("Third bullet point")],  
                    numbering: {  
                        reference: "bullet-list-ref",  
                        level: 0,   
                        instance: 0  
                    }  
                }),    
            ],    
        },  
        multilevel_nested_bullets: {    
            type: PatchType.DOCUMENT,  
            children: [    
                new Paragraph({  
                    children: [new TextRun("Main point level 0 (●)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({  
                    children: [new TextRun("Sub point level 1 (○)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",   
                        level: 1,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({  
                    children: [new TextRun("Sub-sub point level 2 (■)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 2,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({  
                    children: [new TextRun("Another sub point level 1 (○)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 1,   
                        instance: 0  
                    }  
                }),  
                new Paragraph({  
                    children: [new TextRun("Back to main level 0 (●)")],  
                    numbering: {  
                        reference: "bullet-nested-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                })  
            ]    
        },    
        multilevel_nested_numbered: {    
            type: PatchType.DOCUMENT,  
            children: [    
                new Paragraph({  
                    children: [new TextRun("First numbered item")],  
                    numbering: {  
                        reference: "numbered-nested-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({  
                    children: [new TextRun("Nested numbered sub-item")],  
                    numbering: {  
                        reference: "numbered-nested-ref",  
                        level: 1,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({  
                    children: [new TextRun("Deep nested numbered item")],  
                    numbering: {  
                        reference: "numbered-nested-ref",   
                        level: 2,  
                        instance: 0  
                    }  
                }),  
                new Paragraph({  
                    children: [new TextRun("Second numbered item")],  
                    numbering: {  
                        reference: "numbered-nested-ref",  
                        level: 0,  
                        instance: 0  
                    }  
                })  
            ]    
        }    
    }    
}).then((doc) => {    
    fs.writeFileSync("True Nested Lists.docx", doc);    
    console.log("Document with nested structure created successfully!");    
    console.log("Features demonstrated:");    
    console.log("- Nested bullet lists with hierarchy using DOCUMENT patches");    
    console.log("- Nested numbered lists with hierarchy using DOCUMENT patches");    
    console.log("- Multiple levels (●, ○, ■) for bullets");    
    console.log("- Proper indentation and numbering");    
});