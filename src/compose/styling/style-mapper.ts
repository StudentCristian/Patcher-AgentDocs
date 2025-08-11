import { StyleInfo } from "./style-extractor";  
  
/**  
 * StyleMapper adaptado de docxcompose-ts para mapeo bidireccional de estilos  
 * Sigue exactamente el mismo patrón ID→Nombre→ID  
 */  
export class StyleMapper {  
    private styleIdToName: Map<string, string> = new Map();  
    private styleNameToId: Map<string, string> = new Map();  
  
public createStyleIdMapping(sourceStyles: StyleInfo[], masterStyles: StyleInfo[]): void {  
    this.styleIdToName.clear();  
    this.styleNameToId.clear();  
  
    sourceStyles.forEach(style => {  
        this.styleIdToName.set(style.id, style.name);  
    });  
  
    masterStyles.forEach(style => {  
        // Mapeo case-insensitive  
        this.styleNameToId.set(style.name.toLowerCase(), style.id);  
    });  
}  
  
public mappedStyleId(styleId: string): string {  
    if (!this.styleIdToName.has(styleId)) {  
        return styleId;  
    }  
    const styleName = this.styleIdToName.get(styleId);  
    if (!styleName) {  
        return styleId;  
    }  
    // Buscar usando toLowerCase()  
    return this.styleNameToId.get(styleName.toLowerCase()) || styleId;  
} 
  
    // Métodos de debug para inspeccionar el mapeo  
    public getStyleIdToName(): Map<string, string> {  
        return new Map(this.styleIdToName);  
    }  
  
    public getStyleNameToId(): Map<string, string> {  
        return new Map(this.styleNameToId);  
    }  
  
    /**  
     * Verifica si hay un mapeo disponible para un estilo dado  
     */  
    public hasMapping(styleId: string): boolean {  
        if (!this.styleIdToName.has(styleId)) {  
            return false;  
        }  
        const styleName = this.styleIdToName.get(styleId);  
        if (!styleName) {  
            return false;  
        }  
        return this.styleNameToId.has(styleName);  
    }  
  
    /**  
     * Obtiene estadísticas del mapeo actual  
     */  
    public getMappingStats(): {  
        sourceStyles: number;  
        masterStyles: number;  
        successfulMappings: number;  
    } {  
        let successfulMappings = 0;  
          
        for (const [styleId] of this.styleIdToName) {  
            if (this.hasMapping(styleId)) {  
                successfulMappings++;  
            }  
        }  
  
        return {  
            sourceStyles: this.styleIdToName.size,  
            masterStyles: this.styleNameToId.size,  
            successfulMappings  
        };  
    }  

}