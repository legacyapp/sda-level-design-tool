import { JointType } from "./Beat";

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
    if (landmarkType === JointType.LeftWrist) {
        return {
            CircleStrokeColor: "#991b1b",
            CircleFillColor: "#dc2626",
            LineStrokeColor: "#7f1d1d"
        }
    }

    if (landmarkType === JointType.RightWrist) {
        return {
            CircleStrokeColor: "#2563eb",
            CircleFillColor: "#1e40af",
            LineStrokeColor: "#1e3a8a"
        }
    }

    if (landmarkType === JointType.BothWrists) {
        return {
            CircleStrokeColor: "#16a34a",
            CircleFillColor: "#166534",
            LineStrokeColor: "#14532d"
        }
    }
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