import Konva from "konva";
import { Layer } from "konva/lib/Layer";
import { Stage } from "konva/lib/Stage";
import { GetColors } from "./util";
import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import { Message, NotifyDelegate } from "./App";
import { v4 as uuidv4 } from 'uuid';

export class LevelData {
    VideoInfo: VideoInfo;
    // *** NEW DATA STRUCTURE ***
    // *** New scoring system https://docs.google.com/document/d/1Y_A4jWlUhf11H-omHPblzxw00FREIQTM8miHuNF15T0/edit#heading=h.338ki0steug8 ***/
    ID: string;
    Moves: Move[] = [];

    sort() {
        this.Moves = this.Moves.sort(function (a, b) {
            return a.MoveActions[0].TrackingPoints[0].Frame - b.MoveActions[0].TrackingPoints[0].Frame;
        });
    }
}

export class Move {
    ID: string;
    Name: string;
    StartTime: number;
    EndTime: number;
    StartFrame: number;
    EndFrame: number;
    MoveActions: MoveAction[] = []

    updateStartAndEndFrameTime() {
        let startFrame: number = this.MoveActions[0].TrackingPoints[0].Frame;
        let endFrame: number = this.MoveActions[0].TrackingPoints[0].Frame;
        let startTime: number = this.MoveActions[0].TrackingPoints[0].Time;
        let endTime: number = this.MoveActions[0].TrackingPoints[0].Time;

        this.MoveActions.forEach(m => {
            m.TrackingPoints.forEach(p => {
                if (p.Frame <= startFrame) {
                    startFrame = p.Frame;
                }
                if (p.Frame >= endFrame) {
                    endFrame = p.Frame;
                }
                if (p.Time <= startTime) {
                    startTime = p.Time;
                }
                if (p.Time >= endTime) {
                    endTime = p.Time;
                }
            });
        });

        this.StartFrame = startFrame;
        this.EndFrame = endFrame;
        this.StartTime = startTime;
        this.EndTime = endTime;
    }

    static build(currentFrame: number, currentTime): Move {
        const newMove = new Move();
        newMove.ID = uuidv4();
        newMove.Name = "New Move";
        newMove.MoveActions = [MoveAction.build(currentFrame, currentTime)];
        newMove.updateStartAndEndFrameTime();

        return newMove;
    }
}

export class VideoInfo {
    FrameRate: number;
    Height: number;
    Width: number;
    VideoUrl: string;
}

export enum JointType {
    Nose = 0,
    // LeftEyeInner = 1,
    // LeftEye = 2,
    // LeftEyeOuter = 3,
    // RightEyeInner = 4,
    // RightEye = 5,
    // RightEyeOuter = 6,
    // LeftEar = 7,
    // RightEar = 8,
    // MouthLleft = 9,
    // MouthRright = 10,
    LeftShoulder = 11,
    RightShoulder = 12,
    LeftElbow = 13,
    RightElbow = 14,
    LeftWrist = 15,
    RightWrist = 16,
    // LeftPinky = 17,
    // RightPinky = 18,
    LeftIndex = 19,
    RightIndex = 20,
    // LeftThumb = 21,
    // RightThumb = 22,
    LeftHip = 23,
    RightHip = 24,
    LeftKnee = 25,
    RightKnee = 26,
    LeftAnkle = 27,
    RightAnkle = 28,
    // LeftHeel = 29,
    // RightHeel = 30,
    // LeftFootIndex = 31,
    // RightFootIndex = 32,

    // only for old data
    BothWrists = 33
}

export enum MovementType {
    Point = 1,
    Line = 2,
    Shake = 3,
    Bezier = 4
}

// should we rename to TrackingPoint???
export class MoveAction {
    ID: string;
    Name: string;
    Joint: JointType;
    IsMajor: boolean;
    TrackingPoints: TrackingPoint[] = [];
    ScoresRadius: ScoreRadius[] = [];

    // Index is for UI rendering, not save to database
    Index: number;

    constructor() { }

    static build(currentFrame: number, currentTime): MoveAction {
        const newMoveAction = new MoveAction();

        newMoveAction.ID = uuidv4();
        newMoveAction.Name = "New Action";
        newMoveAction.Joint = JointType.Nose;
        newMoveAction.IsMajor = true;
        newMoveAction.ScoresRadius = [{ "Scoring": 100, "Radius": 100 }];
        newMoveAction.Index = 0;

        const trackingPoint = TrackingPoint.build(currentFrame, currentTime);

        newMoveAction.TrackingPoints.push(trackingPoint);

        return newMoveAction;
    }
}

// should we rename to Point
export class TrackingPoint {
    ID: string;
    Pos: Position;
    Time: number;
    Frame: number;
    HoldTime: number;

    static build(currentFrame: number, currentTime): TrackingPoint {
        const trackingPoint = new TrackingPoint();
        trackingPoint.ID = uuidv4();
        const position = new Position();
        trackingPoint.Pos = position;
        trackingPoint.Pos.X = 0.5;
        trackingPoint.Pos.Y = 0.25;
        trackingPoint.Frame = currentFrame;
        trackingPoint.Time = currentTime;
        trackingPoint.HoldTime = 2;

        return trackingPoint;
    }
}

export class Position {
    X: number;
    Y: number;
}

export class ScoreRadius {
    Scoring: number;
    Radius: number;
}

export type FrameData = { normalizedFrames: { landmarks: any; }[]; };

export class DrawingTrackingPoints {
    private stage: Stage;
    private layer: Layer;
    private levelData: LevelData;
    private trackMoveActions = {};
    private notify: NotifyDelegate;

    // function to build anchor point
    private buildAnchor(Id: string, x: number, y: number, color: { CircleStrokeColor: string, CircleFillColor: string }) {
        var anchor = new Konva.Circle({
            x: x,
            y: y,
            radius: 20,
            stroke: color.CircleStrokeColor,
            fill: color.CircleFillColor,
            strokeWidth: 2,
            draggable: true,
            opacity: 0.8,
            // Add custom data
            data: {
                id: Id
            }
        });
        this.layer.add(anchor);

        const self = this;
        // add hover styling
        anchor.on('mouseover', function () {
            document.body.style.cursor = 'pointer';
            this.strokeWidth(4);
        });
        anchor.on('mouseout', function () {
            document.body.style.cursor = 'default';
            this.strokeWidth(2);
        });

        anchor.on('dragend ', function () {
            const data = anchor.getAttr('data');
            const position = this.absolutePosition();
            self.notify(Message.PLAYER_TRACKINGPOINT_UPDATE, {
                Id: data.id,
                Position: position
            })
        });

        // anchor.on('dragmove', function () {
        //   updateDottedLinesFunc();
        // });

        return anchor;
    }

    private drawMoveAction(TrackingPoint: MoveAction, videoWidth: number, videoHeight: number) {
        const color = GetColors(TrackingPoint.Joint);

        if (TrackingPoint.TrackingPoints && TrackingPoint.TrackingPoints.length > 0) {
            const trackingPointCircles = TrackingPoint.TrackingPoints.map((p) => {
                return this.buildAnchor(
                    p.ID,
                    p.Pos.X * videoWidth,
                    p.Pos.Y * videoHeight,
                    color);
            });

            const trackDrawingBeat = {
                StartFrame: TrackingPoint.TrackingPoints[0].Frame,
                EndFrame: TrackingPoint.TrackingPoints[TrackingPoint.TrackingPoints.length - 1].Frame, // TODO: should calculate = Frame + Hold Time
                Circles: trackingPointCircles
            };
            this.trackMoveActions[TrackingPoint.ID] = trackDrawingBeat;
        }
    }

    private updateStageStyleFunc(videoWidth: number, videoHeight: number) {
        const stageSize = this.stage.getSize();
        if (stageSize.width !== videoWidth || stageSize.height !== videoHeight) {
            this.stage.setSize({
                width: videoWidth,
                height: videoHeight
            });
        }
    };

    constructor(configuration: any, videoBeats: LevelData, notify: NotifyDelegate) {
        // Init Konva
        this.stage = new Konva.Stage({
            container: configuration.ContainerId
        });
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        this.levelData = videoBeats;
        this.notify = notify;
    }

    draw(currentFrame: number, videoWidth: number, videoHeight: number, forceToRedraw = false) {
        // Draw beat data in each frame
        this.updateStageStyleFunc(videoWidth, videoHeight);
        // find TrackingPoints to draw at the current frame
        this.levelData.Moves.forEach((move: Move) => {
            move.MoveActions.forEach(moveAction => {
                let startFrame: number = move.MoveActions[0].TrackingPoints[0].Frame;
                let endFrame: number = move.MoveActions[0].TrackingPoints[0].Frame;

                move.MoveActions.forEach(m => {
                    m.TrackingPoints.forEach(p => {
                        if (p.Frame <= startFrame) {
                            startFrame = p.Frame;
                        }
                        if (p.Frame >= startFrame) {
                            endFrame = p.Frame;
                        }
                    });
                });

                if (moveAction.TrackingPoints.length === 1) {
                    const holdTime = moveAction.TrackingPoints[0].HoldTime ? moveAction.TrackingPoints[0].HoldTime : 2;
                    endFrame = moveAction.TrackingPoints[0].Frame + (this.levelData.VideoInfo.FrameRate * holdTime);
                }

                if (startFrame <= currentFrame && currentFrame <= endFrame) {
                    // we need to check forceToRedraw in case we want to re-draw on the current frame that already drew
                    if (forceToRedraw) {
                        this.destroyPoint(moveAction);
                        this.drawMoveAction(moveAction, videoWidth, videoHeight);
                    } else {
                        // if we already draw so do nothing
                        if (this.trackMoveActions[moveAction.ID]) {
                            return;
                        }
                        this.drawMoveAction(moveAction, videoWidth, videoHeight);
                    }
                } else {
                    this.destroyPoint(moveAction);
                }
            });
        });


    }

    destroyOrphanPoints(trackingPointIDs: any) {
        trackingPointIDs.forEach(Id => {
            for (const [key, value] of Object.entries(this.trackMoveActions)) {
                const trackMoveAction = value as any;
                let isFound = false;
                for (let i = 0; i < trackMoveAction.Circles.length; i++) {
                    if (trackMoveAction.Circles[i].getAttr('data').id === Id) {
                        trackMoveAction.Circles[i].destroy();
                        trackMoveAction.Circles[i] = undefined;
                        isFound = true;
                    }
                }

                trackMoveAction.Circles = trackMoveAction.Circles.filter(c => c !== undefined);
            }
        });
    }

    private destroyPoint(p: MoveAction) {
        if (!this.trackMoveActions[p.ID]) {
            return;
        }

        const trackDrawingMoveAction = this.trackMoveActions[p.ID];
        if (trackDrawingMoveAction.Circles && trackDrawingMoveAction.Circles.length > 0) {
            trackDrawingMoveAction.Circles.forEach(c => c.destroy());
        }

        this.trackMoveActions[p.ID] = undefined;
        delete this.trackMoveActions[p.ID];
    }
}

export class DrawingLandmarks {
    private frameData: { normalizedFrames: { landmarks: any; }[]; };
    private canvasElement: HTMLCanvasElement;
    private canvasCtx: CanvasRenderingContext2D;
    private drawingUtils: DrawingUtils;

    constructor(configuration: any, videoBeats: LevelData, frameData: { normalizedFrames: { landmarks: any; }[]; }) {
        this.canvasElement = document.getElementById(configuration.ContainerId) as HTMLCanvasElement;
        this.canvasCtx = this.canvasElement.getContext("2d");
        this.drawingUtils = new DrawingUtils(this.canvasCtx);
        this.frameData = frameData
    }

    private updateCanvasStyleFunc(videoWidth: number, videoHeight: number) {
        // @ts-ignore
        this.canvasElement.style =
            "position: absolute;" +
            "left: 0px;" +
            "top: 0px;" +
            "width: " +
            videoWidth +
            "px;" +
            "height: " +
            videoHeight +
            "px;";
    }

    draw(currentFrame: number, videoWidth: number, videoHeight: number) {
        // Draw landmarks in each frame
        this.updateCanvasStyleFunc(videoWidth, videoHeight);
        const landmarks = this.frameData.normalizedFrames[currentFrame]?.landmarks;
        if (landmarks) {
            this.canvasCtx.save();
            this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            this.drawingUtils.drawLandmarks(
                landmarks,
                {
                    radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
                    lineWidth: 1
                });
            this.drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { lineWidth: 1 });
            this.canvasCtx.restore();
        }
    }
}