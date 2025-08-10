import JSZip from "jszip";

import { InputDataType } from "./from-docx";
import { traverse } from "./traverser";
import { toJson } from "./util";

type PatchDetectorOptions = {
    readonly data: InputDataType;
};

/** Detects which patches are needed/present in a template */
export const patchDetector = async ({ data }: PatchDetectorOptions): Promise<{  
    readonly placeholders: readonly string[];  
    readonly listPatches: readonly string[];  
}> => {  
    const zipContent = data instanceof JSZip ? data : await JSZip.loadAsync(data);  
    const patches = new Set<string>();  
    const listPatches = new Set<string>();  
  
    for (const [key, value] of Object.entries(zipContent.files)) {  
        if (!key.endsWith(".xml") && !key.endsWith(".rels")) {  
            continue;  
        }  
        if (key.startsWith("word/") && !key.endsWith(".xml.rels")) {  
            const json = toJson(await value.async("text"));  
            traverse(json).forEach((p) => {  
                const foundPatches = findPatchKeys(p.text);  
                foundPatches.forEach((patch) => {  
                    patches.add(patch);  
                    // Detectar si es un patch de lista por convención de nombres  
                    if (patch.includes("_list") || patch.includes("_numbered") || patch.includes("_bullet")) {  
                        listPatches.add(patch);  
                    }  
                });  
            });  
        }  
    }  
      
    return {  
        placeholders: Array.from(patches),  
        listPatches: Array.from(listPatches)  
    };  
};

const findPatchKeys = (text: string): readonly string[] => {
    const pattern = /(?<=\{\{).+?(?=\}\})/gs;
    return text.match(pattern) ?? [];
};
