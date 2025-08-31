import { JSDOM } from "jsdom";

/**
 * Define globals de forma segura: crea la propiedad si no existe,
 * asigna si es writeable, redefine si es configurable, o crea un alias como último recurso.
 */
export const setGlobal = (name: string, value: unknown) => {
    const g = globalThis as any;
    const desc = Object.getOwnPropertyDescriptor(g, name);

    if (!desc) {
        Object.defineProperty(g, name, {
            value,
            configurable: true,
            writable: true,
            enumerable: true,
        });
        return;
    }

    if (desc.writable) {
        g[name] = value;
        return;
    }

    if (desc.configurable) {
        Object.defineProperty(g, name, {
            value,
            configurable: true,
            writable: true,
            enumerable: desc.enumerable ?? false,
        });
        return;
    }

    // Fallback: intentar colocar en window (si existe) o crear alias
    try {
        if ((g as any).window && typeof (g as any).window === "object") {
            try {
                (g as any).window[name] = value;
                return;
            } catch {
                // ignore
            }
        }
    } catch {
        // ignore
    }

    const alias = `__jsdom_${name}`;
    Object.defineProperty(g, alias, {
        value,
        configurable: true,
        writable: true,
        enumerable: false,
    });
};

/**
 * Instala un DOM jsdom y expone globals útiles para librerías que esperan browser env.
 * Devuelve el objecto JSDOM creado por si quieres acceder a él.
 */
export const installJsdomGlobals = (html = "<!doctype html><html><body></body></html>") => {
    const dom = new JSDOM(html);

    setGlobal("window", dom.window);
    setGlobal("document", dom.window.document);
    setGlobal("navigator", dom.window.navigator);
    setGlobal("HTMLElement", dom.window.HTMLElement);
    setGlobal("Node", dom.window.Node);

    // exportamos el dom por si hace falta usarlo directamente
    return dom;
};

// Auto-install al importar el módulo (con esto basta con `import "./setup-jsdom"` al inicio de cada demo)
export const dom = installJsdomGlobals();
export default dom;