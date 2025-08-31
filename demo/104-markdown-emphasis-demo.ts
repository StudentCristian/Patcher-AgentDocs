import * as fs from "fs";  
import "./setup-jsdom";  
  
// Import de tipo para TypeScript (no causa import en tiempo de ejecución)  
import type { MarkdownPatch } from "docx";  
  
// Async function para poder usar import dinámico (evita que 'docx' se cargue antes del DOM)  
async function testMarkdownEmphasis() {  
    // Import dinámico para asegurar que 'docx' se importe después del polyfill de DOM  
    const { patchDocument, PatchType, MarkdownPatchProcessor } = await import("docx");  
  
    const processor = new MarkdownPatchProcessor();  
  
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
# Listas de Markdown  
  
## Listas sin orden:  
- Item A  
- Item B    
- Item C  
  
## Listas ordenadas:  
1. First  
2. Second  
3. Third  
  
## Listas anidadas:  
- Parent  
  - Child  
  - Another child  
    - Nested deeper  
- Another parent  
  - Another child  
  
## Lista mixta con formato:  
- **Elemento en negrita**  
- *Elemento en cursiva*  
- ~~Elemento tachado~~  
- Elemento con ***formato mixto***  
            `.trim(),  
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
  
Visita [link text](https://documentero.com)   para buscar información.  
  
También puedes ir a [GitHub](https://github.com) para ver código.  
  
Enlaces con formato: [**Enlace en negrita**](https://documentero.com/) y [*enlace en cursiva*](https://documentero.com/).  
    `.trim(),  
  },  
  "markdown-patch-tables": {  
  type: PatchType.DOCUMENT,  
  markdownContent: `  
# Tablas de Markdown  
  
## Tabla básica:  
| Nombre | Edad | Ciudad |  
|--------|------|--------|  
| Juan   | 25   | Madrid |  
| María  | 30   | Barcelona |  
| Pedro  | 28   | Valencia |  
  
## Tabla con formato:  
| **Producto** | *Precio* | ~~Descuento~~ |  
|--------------|----------|---------------|  
| Laptop       | €999     | ~~€1200~~     |  
| Mouse        | €25      | ~~€30~~       |  

# Tabla con alineación:

| Left align | Right align | Center align |
| :--------- | ----------: | :----------: |
| This       |        This |     This     |
| column     |      column |    column    |
| will       |        will |     will     |
| be         |          be |      be      |
| left       |       right |    center    |
| aligned    |     aligned |   aligned    |

  `.trim(),  
},
    };  
  
    console.log("Iniciando procesamiento de patches de Markdown...");  
    const processedPatches = await processor.processMarkdownPatches(markdownPatches);  
    console.log("Patches procesados exitosamente");  
  
    console.log("Aplicando patches al documento...");  
    const result = await patchDocument({  
        outputType: "nodebuffer",  
        data: fs.readFileSync("demo/assets/patch-md.docx"),  
        patches: processedPatches,  
    });  
  
    if (!fs.existsSync("output")) {  
        fs.mkdirSync("output");  
    }  
  
    fs.writeFileSync("output/output-markdown-emphasis-demo.docx", result);  
      
    console.log("=".repeat(60));  
    console.log("🎉 Demo de conversión Markdown a DOCX completada exitosamente!");  
    console.log("=".repeat(60));  
    console.log("📁 Archivo generado: output/output-markdown-emphasis-demo.docx");  
    console.log("");  
    console.log("✅ Funcionalidades implementadas:");  
    console.log("   • Elementos de énfasis (negrita, cursiva, tachado)");  
    console.log("   • Listas numeradas y con viñetas");  
    console.log("   • Listas anidadas multinivel");  
    console.log("   • Encabezados (H1-H6)");  
    console.log("   • Task Lists con checkboxes interactivos");  
    console.log("   • Integración completa con sistema de numeración y estilos");  
    console.log("=".repeat(60));  
}  
  
testMarkdownEmphasis().catch((error) => {  
    console.error("❌ Error durante la ejecución de la demo:");  
    console.error(error);  
    process.exit(1);  
});