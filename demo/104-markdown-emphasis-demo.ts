// npm run run-ts demo/104-markdown-emphasis-demo.ts  
import * as fs from "fs";    
import "./setup-jsdom";    
    
// Import de tipo para TypeScript (no causa import en tiempo de ejecución)    
import type { MarkdownPatch, ImageData } from "docx";    
    
// Async function para poder usar import dinámico (evita que 'docx' se cargue antes del DOM)    
async function testMarkdownEmphasis() {    
    // Import dinámico para asegurar que 'docx' se importe después del polyfill de DOM    
    const { patchDocument, PatchType, MarkdownPatchProcessor } = await import("docx");    
    
    const processor = new MarkdownPatchProcessor();    
    
    // ImageResolver compartido para todos los patches que tengan imágenes
    const sharedImageResolver = async (url: string): Promise<ImageData> => {    
        console.log(`Resolviendo imagen: ${url}`);    
        try {    
            const response = await fetch(url);    
            if (!response.ok) {    
                throw new Error(`HTTP error! status: ${response.status}`);    
            }    
                
            const buffer = await response.arrayBuffer();    
                
            // Determinar el tipo basado en la URL o headers    
            const contentType = response.headers.get('content-type');    
            let type: "jpg" | "png" | "gif" | "bmp" = "png";   
                
            if (contentType?.includes('jpeg') || url.includes('.jpg') || url.includes('.jpeg')) {    
                type = "jpg";    
            } else if (contentType?.includes('png') || url.includes('.png')) {    
                type = "png";    
            } else if (contentType?.includes('gif') || url.includes('.gif')) {    
                type = "gif";    
            } else if (contentType?.includes('bmp') || url.includes('.bmp')) {    
                type = "bmp";    
            }    
                
            return {    
                image: new Uint8Array(buffer),    
                width: 400, // Ancho deseado en píxeles    
                height: 300, // Alto deseado en píxeles    
                type    
            };    
        } catch (error) {    
            console.error(`Error al resolver imagen ${url}:`, error);    
            throw error;    
        }    
    };
    
    const markdownPatches: Record<string, MarkdownPatch> = {    
        "markdown-patch-paragraph": {    
            type: PatchType.PARAGRAPH,    
            markdownContent: "Este es un texto con **negrita**, *cursiva*, ***negrita y cursiva***, y ~~tachado~~.",    
        },    
        "markdown-patch-document": {    
            type: PatchType.DOCUMENT,    
            markdownContent: `**Texto en negrita** para destacar información importante, *texto en cursiva* para énfasis sutil, ***texto en negrita y cursiva*** para máximo énfasis, y ~~texto tachado~~ para mostrar contenido obsoleto.`,    
        },    
        "markdown-patch-lists": {    
            type: PatchType.DOCUMENT,    
            markdownContent: `    
  
# tabla  

> Nivel 1
>> Nivel 2

> Nota: Este contenido es generado automáticamente.
  
| Tables        | Are           | Cool  |  
| :------------ |:-------------:| -----:|  
| col 3 is      | right-aligned | $1600 |  
| col 2 is      | centered      |   $12 |  
| zebra stripes | are neat      |    $1 |  

Esto es texto

---

Esto es texto
  
Video recomendado  
  
[![Las células procariotas y eucariotas - Ciencias Naturales- Vídeo educativo para niños](https://i.ytimg.com/vi/FJx0auAdQsw/hqdefault.jpg)](https://www.youtube.com/watch?v=FJx0auAdQsw)  

> Nota: Este contenido es generado automáticamente.
  
            `.trim(),    
            imageResolver: sharedImageResolver    
        },    
        "markdown-patch-headings": {    
            type: PatchType.DOCUMENT,    
            markdownContent: `    
# Heading 1    
## Heading 2        
### Heading 3    
#### Heading 4    
##### Heading 5    
###### Heading 6    
    
Este es contenido normal después de los encabezados con **formato** y *énfasis*.    
            `.trim(),    
        },    
        "markdown-patch-task-lists": {    
            type: PatchType.DOCUMENT,    
            markdownContent: `    
# Task Lists (Checkboxes)    
    
## Lista de tareas:    
- [ ] Tarea pendiente    
- [x] Tarea completada    
- [ ] Otra tarea pendiente    
- [x] Otra tarea completada    
    
## Lista mixta con tareas y formato:    
- [ ] **Tarea importante** pendiente    
- [x] *Tarea en cursiva* completada    
- [ ] ~~Tarea tachada~~ pendiente    
- [x] Tarea con ***formato mixto*** completada    
    
## Listas anidadas con tareas:    
- [ ] Tarea principal    
  - [x] Subtarea completada    
  - [ ] Subtarea pendiente    
- [x] Otra tarea principal    
  - [ ] Subtarea pendiente    
            `.trim(),    
        },    
        "markdown-patch-links": {    
            type: PatchType.DOCUMENT,    
            markdownContent: `    
# Enlaces de Markdown    
    
Visita [link text](https://documentero.com) para buscar información.    
    
También puedes ir a [GitHub](https://github.com) para ver código.    
    
Enlaces con formato: [**Enlace en negrita**](https://documentero.com/) y [*enlace en cursiva*](https://documentero.com/).    
            `.trim(),    
        },    
        "markdown-patch-tables": {    
            type: PatchType.DOCUMENT,    
            markdownContent: `    
## Contenido para estructuracion  
  
Contenido generado basado en: "Estructuración"  
  
Este es un **ejemplo de markdown** con:  
- Listas  
- Formato  
- Y más  
  
# Markdown Cheatsheet  
  
## Headings  
# Heading 1  
## Heading 2  
### Heading 3  
  
## Emphasis  
*italic* or _italic_    
**bold** or __bold__    
***bold italic***    
~~strikethrough~~  
  
## Links & Images  
[link text](https://documentero.com)    
![alt text](https://documentero.com/custom/landing4.png)  
  
## Lists  
Unordered:  
- Item A  
- Item B  
- Item C  
  
Ordered:  
1. First  
2. Second  
  
Nested:  
- Parent  
  - Child  
  
## Tables  
| Name  | Age |  
|-------|-----|  
| Alice |  24 |  
| Bob   |  30 |  
  
> Nota: Este contenido es generado automáticamente.  
            `.trim(),
            imageResolver: sharedImageResolver    
        },    
        "markdown-patch-images": {    
            type: PatchType.DOCUMENT,    
            markdownContent: `    
## Contenido para exploracion  
  
Contenido generado basado en: "Exploración"  
  
Este es un **ejemplo de markdown** con:  
- Listas  
- Formato  
- Y más  
  
> Nota: Este contenido es generado automáticamente.  
  
# Markdown Cheatsheet  
  
## Headings  
# Heading 1  
## Heading 2  
### Heading 3  
  
## Emphasis  
*italic* or _italic_    
**bold** or __bold__    
***bold italic***    
~~strikethrough~~  
  
## Links & Images  
[link text](https://documentero.com)    
![alt text](https://documentero.com/custom/landing4.png)  
  
## Lists  
Unordered:  
- Item A  
- Item B  
- Item C  
  
Ordered:  
1. First  
2. Second  
  
Nested:  
- Parent  
  - Child  
  
## Tables  
| Name  | Age |  
|-------|-----|  
| Alice |  24 |  
| Bob   |  30 |  
            `.trim(),    
            imageResolver: sharedImageResolver    
        },    
    };    
    
    console.log("Iniciando procesamiento de patches de Markdown...");    
    const processedPatches = await processor.processMarkdownPatches(markdownPatches);    
    console.log("Patches procesados exitosamente");    
    
    console.log("Aplicando patches al documento...");    
    const result = await patchDocument({    
        outputType: "nodebuffer",    
        data: fs.readFileSync("demo/assets/formato.docx"),    
        patches: processedPatches,    
    });    
    
    if (!fs.existsSync("output")) {    
        fs.mkdirSync("output");    
    }    
    
    const outputFileName = `output/output-markdown-demo-${Date.now()}.docx`;
    fs.writeFileSync(outputFileName, result);    
        
    console.log("=".repeat(60));    
    console.log("Demo de conversión Markdown a DOCX completada exitosamente!");    
    console.log("=".repeat(60));    
    console.log(`Archivo generado: ${outputFileName}`);    
}    
    
testMarkdownEmphasis().catch((error) => {    
    console.error("Error durante la ejecución de la demo:");    
    console.error(error);    
    process.exit(1);    
});