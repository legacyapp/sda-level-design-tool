import Konva from "konva";
import { Layer } from "konva/lib/Layer";
import { Stage } from "konva/lib/Stage";
import { GetColors } from "./util";
import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import { Message, NotifyDelegate } from "./App";

export class LevelData {
    VideoInfo: VideoInfo;
    // *** NEW DATA STRUCTURE ***
    // *** New scoring system https://docs.google.com/document/d/1Y_A4jWlUhf11H-omHPblzxw00FREIQTM8miHuNF15T0/edit#heading=h.338ki0steug8 ***/
    ID: string;
    Moves: Move[] = [];
}

export class Move {
    ID: string;
    Name: string;
    StartTime: number;
    EndTime: number;
    StartFrame: number;
    EndFrame: number;
    MoveActions: MoveAction[] = []

    update() {
        let startFrame: number = this.MoveActions[0].TrackingPoints[0].Frame;
        let endFrame: number = this.MoveActions[0].TrackingPoints[0].Frame;

        this.MoveActions.forEach(m => {
            m.TrackingPoints.forEach(p => {
                if (p.Frame <= startFrame) {
                    startFrame = p.Frame;
                }
                if (p.Frame >= startFrame) {
                    endFrame = p.Frame;
                }
            });
        });

        this.StartFrame = startFrame;
        this.EndFrame = endFrame;

        console.log(this)
    }
}

export class VideoInfo {
    FrameRate: number;
    Height: number;
    Width: number;
    VideoUrl: string;
}

export enum JointType {
    Nose = "Nose",
    RightShoulder = "RightShoulder",
    LeftShoulder = "LeftShoulder",
    RightWrist = "RightWrist",
    LeftWrist = "LeftWrist",
    RightHip = "RightHip",
    LeftHip = "LeftHip",
    RightAnkle = "RightAnkle",
    LeftAnkle = "LeftAnkle",

    // only for old data
    BothWrists = "BothWrists"
}

export enum TrackingVFX {
    None,
    SimpleDirection,
    Shake,
    Swipe,
    BodyRoll
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
    VFX:TrackingVFX;
    IsMajor: boolean;
    TrackingPoints: TrackingPoint[] = [];

    // Movement type can be calculated by number of beat
    Movement: MovementType;
    ScoresRadius: ScoreRadius[] = [];
}

// should we rename to Point
export class TrackingPoint {
    ID: string;
    Pos: Position;
    Time: number;
    Frame: number;
    HoldTime: number;
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

export class DrawingBeats {
    private stage: Stage;
    private layer: Layer;
    private levelData: LevelData;
    private trackDrawingBeats = {};
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

    private drawTrackingPoint(TrackingPoint: MoveAction, videoWidth: number, videoHeight: number) {
        // if we already draw this TrackingPoint so do nothing

        // draw beat TrackingPoint and add to the track list

        // function to update line points from anchors
        // const updateDottedLinesFunc = function updateDottedLines(bezier) {
        //   var b = bezier;
        //   var bezierLinePath = layer.findOne('#bezierLinePath');

        //   // @ts-ignore
        //   bezierLinePath.points([
        //     b.start.x(),
        //     b.start.y(),
        //     b.control1.x(),
        //     b.control1.y(),
        //     b.control2.x(),
        //     b.control2.y(),
        //     b.end.x(),
        //     b.end.y(),
        //   ]);
        // };

        const color = GetColors(TrackingPoint.Joint);

        if (TrackingPoint.TrackingPoints.length === 1) {
            const holdTime = TrackingPoint.TrackingPoints[0].HoldTime ? TrackingPoint.TrackingPoints[0].HoldTime : 2;
            const endFrame = TrackingPoint.TrackingPoints[0].Frame + (this.levelData.VideoInfo.FrameRate * holdTime);
            const trackDrawingBeat = {
                StartFrame: TrackingPoint.TrackingPoints[0].Frame,
                EndFrame: endFrame, // TODO: should calculate = Frame + Hold Time
                Bezier: {
                    start: this.buildAnchor(
                        TrackingPoint.TrackingPoints[0].ID,
                        TrackingPoint.TrackingPoints[0].Pos.X * videoWidth,
                        TrackingPoint.TrackingPoints[0].Pos.Y * videoHeight,
                        color),
                    control1: undefined,
                    control2: undefined,
                    end: undefined,
                },
                BezierLine: undefined,
                BezierLinePath: undefined
            };
            this.trackDrawingBeats[TrackingPoint.ID] = trackDrawingBeat;
        }

        if (TrackingPoint.TrackingPoints.length === 4) {
            const trackDrawingBeat = {
                StartFrame: TrackingPoint.TrackingPoints[0].Frame,
                EndFrame: TrackingPoint.TrackingPoints[TrackingPoint.TrackingPoints.length - 1].Frame,
                Bezier: {
                    start: this.buildAnchor(
                        TrackingPoint.TrackingPoints[0].ID,
                        TrackingPoint.TrackingPoints[0].Pos.X * videoWidth,
                        TrackingPoint.TrackingPoints[0].Pos.Y * videoHeight,
                        color),
                    control1: this.buildAnchor(
                        TrackingPoint.TrackingPoints[1].ID,
                        TrackingPoint.TrackingPoints[1].Pos.X * videoWidth,
                        TrackingPoint.TrackingPoints[1].Pos.Y * videoHeight,
                        color),
                    control2: this.buildAnchor(
                        TrackingPoint.TrackingPoints[2].ID,
                        TrackingPoint.TrackingPoints[2].Pos.X * videoWidth,
                        TrackingPoint.TrackingPoints[2].Pos.Y * videoHeight,
                        color),
                    end: this.buildAnchor(
                        TrackingPoint.TrackingPoints[3].ID,
                        TrackingPoint.TrackingPoints[3].Pos.X * videoWidth,
                        TrackingPoint.TrackingPoints[3].Pos.Y * videoHeight,
                        color),
                },
                BezierLine: undefined,
                BezierLinePath: undefined
            };

            // we will use custom shape for curve
            var bezierLine = new Konva.Shape({
                stroke: color.LineStrokeColor,
                strokeWidth: 5,
                sceneFunc: (ctx, shape) => {
                    ctx.beginPath();
                    ctx.moveTo(trackDrawingBeat.Bezier.start.x(), trackDrawingBeat.Bezier.start.y());
                    ctx.bezierCurveTo(
                        trackDrawingBeat.Bezier.control1.x(),
                        trackDrawingBeat.Bezier.control1.y(),
                        trackDrawingBeat.Bezier.control2.x(),
                        trackDrawingBeat.Bezier.control2.y(),
                        trackDrawingBeat.Bezier.end.x(),
                        trackDrawingBeat.Bezier.end.y()
                    );
                    ctx.fillStrokeShape(shape);
                },
            });
            this.layer.add(bezierLine);

            trackDrawingBeat.BezierLine = bezierLine;

            // var bezierLinePath = new Konva.Line({
            //   dash: [10, 10, 0, 10],
            //   strokeWidth: 3,
            //   stroke: 'black',
            //   lineCap: 'round',
            //   id: 'bezierLinePath',
            //   opacity: 0.3,
            //   points: [0, 0],
            // });
            // layer.add(bezierLinePath);
            // trackDrawingBeat.BezierLinePath = bezierLinePath;
            this.trackDrawingBeats[TrackingPoint.ID] = trackDrawingBeat;
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
            move.MoveActions.forEach(p => {
                let startFrame: number = p.TrackingPoints[0].Frame;
                let endFrame = p.TrackingPoints[p.TrackingPoints.length - 1].Frame;
                if (p.TrackingPoints.length === 1) {
                    const holdTime = p.TrackingPoints[0].HoldTime ? p.TrackingPoints[0].HoldTime : 2;
                    endFrame = p.TrackingPoints[0].Frame + (this.levelData.VideoInfo.FrameRate * holdTime);
                }

                if (startFrame <= currentFrame && currentFrame <= endFrame) {
                    // we need to check forceToRedraw in case we want to re-draw on the current frame that already drew
                    if (forceToRedraw) {
                        this.destroyPoint(p);
                        this.drawTrackingPoint(p, videoWidth, videoHeight);
                    } else {
                        // if we already draw so do nothing
                        if (this.trackDrawingBeats[p.ID]) {
                            return;
                        }
                        this.drawTrackingPoint(p, videoWidth, videoHeight);
                    }
                } else {
                    this.destroyPoint(p);
                }
            });
        });
    }

    private destroyPoint(p: MoveAction) {
        if (!this.trackDrawingBeats[p.ID]) {
            return;
        }

        const trackDrawingBeat = this.trackDrawingBeats[p.ID];
        trackDrawingBeat.Bezier.start?.destroy();
        trackDrawingBeat.Bezier.control1?.destroy();
        trackDrawingBeat.Bezier.control2?.destroy();
        trackDrawingBeat.Bezier.end?.destroy();
        trackDrawingBeat.BezierLine?.destroy();
        trackDrawingBeat.BezierLinePath?.destroy();
        this.trackDrawingBeats[p.ID] = undefined;
        delete this.trackDrawingBeats[p.ID];
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