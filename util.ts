import { JointColors, JointType } from "./Beat";

export function Once(fn: Function, context: any) {
    var result: any;
    return function () {
        if (fn) {
            result = fn.apply(context || this, arguments);
            fn = null;
        }
        return result;
    };
}

export function GetColors(landmarkType: JointType) {
    for (let i = 0; i < JointColors.length; i++) {
        if (JointColors[i].Id === landmarkType) {
            return {
                stroke: JointColors[i].StrokeColor,
                fill: JointColors[i].FillColor
            };
        }
    }

    return {
        stroke: "#16a34a",
        fill: "#166534"
    };
}

export function deepGet(obj, path) {
    // Normalize the path string to handle edge cases like brackets
    const normalizedPath = path.replace(/\[([^\[\]]*)\]/g, '.$1.');

    // Split the normalized path into an array of keys
    const keys = normalizedPath.split('.').filter(key => key !== '');

    // Use reduce to access the nested property
    return keys.reduce((currentObj, key) => currentObj?.[key], obj);
}

export function deepSet(obj, path, value) {
    const re = /(\.|\[\]\.)/g;
    let i = 0, match = null;
    while (match = re.exec(path)) {
        const sep = match[0];
        const { length } = sep;
        const { index } = match;
        obj = obj[path.slice(i, index)];
        i = index + length;
        if (1 < length) {
            path = path.slice(i);
            obj.forEach(obj => {
                deepSet(obj, path, value);
            });
            return;
        }
    }
    obj[path.slice(i)] = value;
}

export function parseNumber(str) {
    // First, try to parse as a float
    let result = parseFloat(str);
    if (!isNaN(result)) {
        return result;
    }

    // If parsing as a float failed, try parsing as an integer
    result = parseInt(str, 10);
    return result;
}

export function dropLastN(arr: any, n = 1) {
    return arr.slice(0, -n);
}

export function scrollIntoViewIfNeeded(element) {
    if (element) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;

        // Check if the element is in the viewport
        const isInViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= windowHeight &&
            rect.right <= windowWidth
        );

        if (!isInViewport) {
            // Scroll the element into view
            element.scrollIntoView();
        }
    }
}

export interface ParentChildMessage {
    type: string;
    data?: any;
}

export enum MessageTypes {
    ChildReady = "CHILD_READY",
    ChildSave = "CHILD_SAVE",
    ChildRequestSongDataConfig = "CHILD_REQUEST_SONG_DATA_CONFIG",
    ParentReady = "PARENT_READY",
    ParentSendBlueprintVersion = "PARENT_SEND_BLUEPRINT_VERSION",
    ParentSendSongDataConfig = "PARENT_SEND_SONG_DATA_CONFIG",
    ParentSaveLevelData = "PARENT_SAVE_LEVEL_DATA"
  }