import { FrameAdjust, JointColors, JointType, LevelData, Move, MoveAction, Position, ScoreRadius, TrackingAdjustSetting, TrackingPoint } from "./Beat";

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
    ChildRequestLevelData = "CHILD_REQUEST_LEVEL_DATA",
    ParentReady = "PARENT_READY",
    ParentSendBlueprintVersion = "PARENT_SEND_BLUEPRINT_VERSION",
    ParentSendLevelData = "PARENT_SEND_LEVEL_DATA",
    ParentSendSongDataConfig = "PARENT_SEND_SONG_DATA_CONFIG",
    ParentSaveLevelData = "PARENT_SAVE_LEVEL_DATA",
}

export function getEnumNameFromValue(value: number): string | undefined {
    // Check if the value exists in the enum
    if (value in JointType) {
        return JointType[value];
    }
    return undefined;
}

// Helper function to lowercase the first character of a string
export const lowercaseFirst = (str: string) => `${str.charAt(0).toLowerCase()}${str.slice(1)}`;

export const uppercaseFirst = (str: string) => `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

// Recursive function to rename all properties in depth
export const renamePropertiesInDepth: any = (obj: any) => {
    if (Array.isArray(obj)) {
        return obj.map((item) =>
            typeof item === 'object' && item !== null ? renamePropertiesInDepth(item) : item,
        );
    }

    if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).reduce((acc: any, key) => {
            const newKey = key === 'id' ? 'ID' : uppercaseFirst(key);
            acc[newKey] = renamePropertiesInDepth(obj[key]);

            if (newKey === 'Joint') {
                acc[newKey] = JointType[acc[newKey]];
            }

            return acc;
        }, {});
    }

    return obj;
};

export function convertToLevelData(id, data) {
    const levelData = new LevelData();

    levelData.ID = id;
    levelData.Title = data.info?.songTitle

    if (data.levelData && data.levelData.VideoInfo) {
        const videoInfo = {
            FrameRate: data.levelData.VideoInfo.FrameRate,
            Height: data.levelData.VideoInfo.Height,
            Width: data.levelData.VideoInfo.Width,
            VideoUrl: data.levelData.VideoInfo.VideoUrl,
        }
        levelData.VideoInfo = videoInfo;
    }

    if (data.levelData && data.levelData.Moves) {
        const moves = data.levelData.Moves.map(m => {
            const moveActions = m.MoveActions.map(ma => {
                const trackingPoints = ma.TrackingPoints.map((tp, i) => {
                    const trackingPoint = new TrackingPoint();

                    trackingPoint.ID = tp.ID;
                    trackingPoint.Pos = new Position();
                    trackingPoint.Pos.X = tp.Pos.X;
                    trackingPoint.Pos.Y = tp.Pos.Y;
                    trackingPoint.Time = tp.Time;
                    trackingPoint.Frame = tp.Frame;
                    trackingPoint.HoldTime = tp.HoldTime;
                    trackingPoint.Index = (tp.Index === undefined || tp.Index === null) ? i : tp.Index;
                    if (tp.ScoresRadius && tp.ScoresRadius.length > 0) {
                        const scoreRadiues = tp.ScoresRadius.map(s => {
                            const scoreRadius = new ScoreRadius();
                            scoreRadius.Radius = s.Radius;
                            scoreRadius.Scoring = s.Scoring;
                            return scoreRadius;
                        });
                        trackingPoint.ScoresRadius = scoreRadiues;
                    }

                    return trackingPoint;
                });
                const scoreRadiues = ma.ScoresRadius.map(s => {
                    const scoreRadius = new ScoreRadius();
                    scoreRadius.Radius = s.Radius;
                    scoreRadius.Scoring = s.Scoring;
                    return scoreRadius;
                });

                const moveAction = new MoveAction();

                moveAction.ID = ma.ID;
                moveAction.Name = ma.Name ? ma.Name : "";
                moveAction.Joint = ma.Joint;
                moveAction.IsMajor = ma.IsMajor;
                moveAction.TrackingPoints = trackingPoints;
                moveAction.ScoresRadius = scoreRadiues;
                if (ma.Threshold >= 0) {
                    moveAction.Threshold = ma.Threshold;
                }

                return moveAction;
            })

            const move = new Move();

            move.ID = m.ID
            move.Name = m.Name;
            move.StartTime = m.StartTime;
            move.EndTime = m.EndTime;
            move.StartFrame = m.StartFrame || 0;
            move.EndFrame = m.EndFrame || 0;
            move.MoveActions = moveActions;

            // If the start frame/time and the end frame/time are incorrect, we should re-calculate them.
            move.updateStartAndEndFrameTime();

            return move;
        });

        levelData.Moves = moves;
    }

    const trackingAdjustSettingFromDb = data.TrackingAdjustSetting || data.levelData?.TrackingAdjustSetting;
    if (trackingAdjustSettingFromDb) {
        const trackingAdjustSetting = new TrackingAdjustSetting();

        if (trackingAdjustSettingFromDb.FramesStopAdjustScale && trackingAdjustSettingFromDb.FramesStopAdjustScale.length > 0) {
            const framesStopAdjustScale = trackingAdjustSettingFromDb.FramesStopAdjustScale.map((f, i) => {
                return new FrameAdjust(f.StartFrame, f.EndFrame, i, "FramesStopAdjustScale");
            });
            trackingAdjustSetting.FramesStopAdjustScale = framesStopAdjustScale;
        }

        if (trackingAdjustSettingFromDb.FramesStopAdjustPosition && trackingAdjustSettingFromDb.FramesStopAdjustPosition.length > 0) {
            const framesStopAdjustPosition = trackingAdjustSettingFromDb.FramesStopAdjustPosition.map((f, i) => {
                return new FrameAdjust(f.StartFrame, f.EndFrame, i, "FramesStopAdjustPosition");
            });
            trackingAdjustSetting.FramesStopAdjustPosition = framesStopAdjustPosition;
        }

        levelData.TrackingAdjustSetting = trackingAdjustSetting;
    }

    return levelData;
}