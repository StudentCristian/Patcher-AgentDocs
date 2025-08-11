import { BaseXmlComponent, IContext, IXmlableObject } from "@file/xml-components";
import { StyleMapper } from "../compose/styling/style-mapper";  
import { StyleInterceptor } from "../compose/styling/style-interceptor";  

export class Formatter {  
    private styleInterceptor?: StyleInterceptor;  
  
    constructor(styleMapper?: StyleMapper) {  
        if (styleMapper) {  
            this.styleInterceptor = new StyleInterceptor(styleMapper);  
        }  
    } 
  
    public format(input: BaseXmlComponent, context: IContext = { stack: [] } as unknown as IContext): IXmlableObject {  
        let output = input.prepForXml(context);  
  
        if (!output) {  
            throw Error("XMLComponent did not format correctly");  
        }  
  
        // Aplicar interceptor de estilos después del formateo pero antes de retornar  
        if (this.styleInterceptor) {  
            output = this.styleInterceptor.interceptAndTransform(output);  
        }  
  
        return output;  
    }  
}
