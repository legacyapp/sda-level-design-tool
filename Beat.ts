import Konva from "konva";
import { Layer } from "konva/lib/Layer";
import { Stage } from "konva/lib/Stage";
import { GetColors } from "./util";
import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import { ApplicationState, Message, NotifyDelegate } from "./App";
import { v4 as uuidv4 } from 'uuid';
import { Text } from "konva/lib/shapes/Text";

interface TrackDrawingBeat {
    StartFrame: number,
    EndFrame: number,
    Circles: Konva.Circle[],
    ScoreRadiusCircles: Konva.Circle[]
};

export class LevelData {
    VideoInfo: VideoInfo;
    // *** NEW DATA STRUCTURE ***
    // *** New scoring system https://docs.google.com/document/d/1Y_A4jWlUhf11H-omHPblzxw00FREIQTM8miHuNF15T0/edit#heading=h.338ki0steug8 ***/
    ID: string;
    Title: string;
    Moves: Move[] = [];

    sort() {
        this.Moves = this.Moves.sort(function (a, b) {
            return a.MoveActions[0].TrackingPoints[0].Frame - b.MoveActions[0].TrackingPoints[0].Frame;
        });
    }

    getTrackingPoint(trackingPointId: string) {
        for (let i = 0; i < this.Moves.length; i++) {
            for (let j = 0; j < this.Moves[i].MoveActions.length; j++) {
                for (let k = 0; k < this.Moves[i].MoveActions[j].TrackingPoints.length; k++) {
                    if (trackingPointId === this.Moves[i].MoveActions[j].TrackingPoints[k].ID) {
                        return this.Moves[i].MoveActions[j].TrackingPoints[k];
                    }
                }
            }
        }
    }
}

export class Move {
    ID: string;
    Name: string = "";
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

export const JointColors = [
    {
        Id: 0,
        StrokeColor: "#a8a29e", // 400
        FillColor: "#e7e5e4" // 200
    },
    {
        Id: 11,
        StrokeColor: "#991b1b", // 800 Red
        FillColor: "#dc2626" // 600 Red
    },
    {
        Id: 12,
        StrokeColor: "#9f1239", // 800 Rose
        FillColor: "#e11d48" // 600 Rose
    },
    {
        Id: 13,
        StrokeColor: "#9d174d", // 800 Pink
        FillColor: "#db2777" // 600 Pink
    },
    {
        Id: 14,
        StrokeColor: "#86198f", // 800 Fuchsia
        FillColor: "#c026d3" // 600 Fuchsia
    },
    {
        Id: 15,
        StrokeColor: "#9a3412", // 800 Orange
        FillColor: "#ea580c" // 400 Orange
    },
    {
        Id: 16,
        StrokeColor: "#166534", // 800 Green
        FillColor: "#16a34a" // 400 Green
    },
    {
        Id: 19,
        StrokeColor: "#92400e", // 800 Amber
        FillColor: "#d97706" // 400 Orange
    },
    {
        Id: 20,
        StrokeColor: "#065f46", // 800 Emerald
        FillColor: "#059669" // 400 Emerald
    },
    {
        Id: 23,
        StrokeColor: "#854d0e", // 800 Yellow
        FillColor: "#ca8a04" // 400 Yellow
    },
    {
        Id: 24,
        StrokeColor: "#115e59", // 800 Teal
        FillColor: "#0d9488" // 400 Teal
    },
    {
        Id: 25,
        StrokeColor: "#3f6212", // 800 Lime
        FillColor: "#65a30d" // 400 Orange
    },
    {
        Id: 26,
        StrokeColor: "#155e75", // 800 Cyan
        FillColor: "#0891b2" // 400 Cyan
    },
    {
        Id: 27,
        StrokeColor: "#075985", // 800 Sky
        FillColor: "#0284c7" // 400 Orange
    },
    {
        Id: 28,
        StrokeColor: "#1e40af", // 800 Blue
        FillColor: "#2563eb" // 400 Blue
    },
];

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
    IsShowScoreRadius: boolean = false;

    // Index is for UI rendering, not save to database
    Index: number;

    constructor() {
        this.Name = ""
    }

    static build(currentFrame: number, currentTime): MoveAction {
        const newMoveAction = new MoveAction();

        newMoveAction.ID = uuidv4();
        newMoveAction.Name = "New Action";
        newMoveAction.Joint = JointType.Nose;
        newMoveAction.IsMajor = false;
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
    ScoresRadius: ScoreRadius[] = [];
    IsShowScoreRadius: boolean = false;

    constructor() { }

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
    private ApplicationState: ApplicationState;
    private trackMoveActions: { [key: string]: TrackDrawingBeat; } = {};
    private notify: NotifyDelegate;
    private anim: any;

    private startAnimation(circle) {
        this.anim = new Konva.Animation(function (frame) {
            var scale = Math.sin(frame.time * 0.005) + 1;
            //circle.scale({ x: scale, y: scale });

            // Animate stroke width and shadow blur
            var strokeWidth = 4 + Math.sin(frame.time * 0.01) * 2;
            //var shadowBlur = 10 + Math.sin(frame.time * 0.01) * 5;
            circle.strokeWidth(strokeWidth);
            //circle.shadowBlur(shadowBlur);
        }, this.layer);

        this.anim.start();
    }

    private stopAnimation(circle) {
        if (this.anim) {
            this.anim.stop();
            this.anim = null;
            // Reset circle properties
            //circle.scale({ x: 1, y: 1 });
            circle.strokeWidth(2);
            //circle.shadowBlur(10);
        }
    }

    // function to build tracking point circle
    private buildTrackingPointCircle(
        data: object,
        x: number,
        y: number,
        color: { stroke: string, fill: string },
        radius = 20
    ) {
        var circle = new Konva.Circle({
            x: x,
            y: y,
            radius: radius,
            stroke: color.stroke,
            strokeWidth: 3,
            fill: color.fill,
            draggable: true,
            opacity: 0.7,
            // Add custom data
            data: data
        });
        this.layer.add(circle);

        const self = this;
        // add hover styling
        circle.on('mouseover', function () {
            document.body.style.cursor = 'pointer';
            this.strokeWidth(5);
            self.notify(Message.PLAYER_TRACKINGPOINT_MOUSEOVER, this.getAttr('data').id);
            //self.startAnimation(this);
        });
        circle.on('mouseout', function () {
            document.body.style.cursor = 'default';
            this.strokeWidth(3);

            self.notify(Message.PLAYER_TRACKINGPOINT_MOUSEOUT, this.getAttr('data').id);
            //self.stopAnimation(this);
        });

        circle.on('dragstart', function () {
            self.notify(Message.PLAYER_TRACKINGPOINT_CLICK, this.getAttr('data').id)
        });

        circle.on('click', function () {
            self.notify(Message.PLAYER_TRACKINGPOINT_CLICK, this.getAttr('data').id)
        });

        circle.on('dragend', function () {
            const data = circle.getAttr('data');
            const position = this.absolutePosition();
            self.notify(Message.PLAYER_TRACKINGPOINT_UPDATE, {
                Id: data.id,
                Position: position
            });
        });

        circle.on('dragmove', function () {
            // update the score radius circles
            const trackingPointId = this.getAttr('data').id;
            const moveActionId = this.getAttr('data').moveActionId;
            const trackMoveAction = self.trackMoveActions[moveActionId];
            const position = this.absolutePosition();
            if (trackMoveAction.ScoreRadiusCircles && trackMoveAction.ScoreRadiusCircles.length > 0) {
                trackMoveAction.ScoreRadiusCircles.forEach(c => {
                    if (trackingPointId === c.getAttr('data').id) {
                        c.x(position.x);
                        c.y(position.y);
                        self.layer.draw();
                    }
                });
            }
        });

        return circle;
    }

    private buildScoreRadiusCircle(
        data: object,
        x: number,
        y: number,
        color: { stroke: string, fill: string },
        radius = 20
    ) {
        var circle = new Konva.Circle({
            x: x,
            y: y,
            radius: radius,
            stroke: color.stroke,
            strokeWidth: 3,
            fill: color.fill,
            opacity: 0.7,
            // Add custom data
            data: data,
            hitFunc: function (context) {
                context.beginPath();
                context.arc(0, 0, this.radius(), 0, Math.PI * 2, true);
                context.closePath();
                context.strokeShape(this);
            },
        });
        this.layer.add(circle);

        const self = this;
        // add hover styling
        circle.on('mouseover', function () {
            document.body.style.cursor = 'pointer';
            this.strokeWidth(5);
            self.notify(Message.PLAYER_TRACKINGPOINT_MOUSEOVER, this.getAttr('data').id);
            //self.startAnimation(this);
        });
        circle.on('mouseout', function () {
            document.body.style.cursor = 'default';
            this.strokeWidth(3);

            self.notify(Message.PLAYER_TRACKINGPOINT_MOUSEOUT, this.getAttr('data').id);
            //self.stopAnimation(this);
        });

        // circle.on('dragstart', function () {
        //     self.notify(Message.PLAYER_TRACKINGPOINT_CLICK, this.getAttr('data').id)
        // });

        circle.on('click', function () {
            self.notify(Message.PLAYER_TRACKINGPOINT_CLICK, this.getAttr('data').id)
        });

        // circle.on('dragend', function () {
        //     const data = circle.getAttr('data');
        //     const position = this.absolutePosition();
        //     self.notify(Message.PLAYER_TRACKINGPOINT_UPDATE, {
        //         Id: data.id,
        //         Position: position
        //     });
        // });

        // anchor.on('dragmove', function () {
        //   updateDottedLinesFunc();
        // });

        return circle;
    }


    private drawMoveAction(moveAction: MoveAction, videoWidth: number, videoHeight: number) {
        const color = GetColors(moveAction.Joint);

        if (moveAction.TrackingPoints && moveAction.TrackingPoints.length > 0) {
            const trackingPointCircles = moveAction.TrackingPoints.map((p) => {
                return this.buildTrackingPointCircle(
                    { id: p.ID, moveActionId: moveAction.ID },
                    p.Pos.X * videoWidth,
                    p.Pos.Y * videoHeight,
                    color);
            });

            let scoreRadiusCircles: Konva.Circle[] = [];
            for (let i = 0; i < moveAction.TrackingPoints.length; i++) {
                const p = moveAction.TrackingPoints[i];
                if (p.ScoresRadius && p.ScoresRadius.length > 0) {
                    for (let j = 0; j < p.ScoresRadius.length; j++) {
                        if (moveAction.IsShowScoreRadius || p.IsShowScoreRadius) {
                            const circle = this.buildScoreRadiusCircle(
                                { id: p.ID, moveActionId: moveAction.ID },
                                p.Pos.X * videoWidth,
                                p.Pos.Y * videoHeight,
                                { stroke: color.stroke, fill: null },
                                p.ScoresRadius[j].Radius * videoWidth);
                            scoreRadiusCircles.push(circle);
                        }
                    }

                } else if (moveAction.ScoresRadius && moveAction.ScoresRadius.length > 0) {
                    for (let j = 0; j < moveAction.ScoresRadius.length; j++) {
                        if (moveAction.IsShowScoreRadius || p.IsShowScoreRadius) {
                            const circle = this.buildScoreRadiusCircle(
                                { id: p.ID, moveActionId: moveAction.ID },
                                p.Pos.X * videoWidth,
                                p.Pos.Y * videoHeight,
                                { stroke: color.stroke, fill: null },
                                moveAction.ScoresRadius[j].Radius * videoWidth);
                            scoreRadiusCircles.push(circle);
                        }
                    }
                }
            }

            const trackDrawingBeat: TrackDrawingBeat = {
                StartFrame: moveAction.TrackingPoints[0].Frame,
                EndFrame: moveAction.TrackingPoints[moveAction.TrackingPoints.length - 1].Frame, // TODO: should calculate = Frame + Hold Time
                Circles: trackingPointCircles,
                ScoreRadiusCircles: scoreRadiusCircles
            };
            this.trackMoveActions[moveAction.ID] = trackDrawingBeat;
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

    constructor(configuration: any, applicationState: ApplicationState, notify: NotifyDelegate) {
        // Init Konva
        this.stage = new Konva.Stage({
            container: configuration.ContainerId
        });
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        this.ApplicationState = applicationState;
        this.notify = notify;
    }

    draw(currentFrame: number, videoWidth: number, videoHeight: number, forceToRedraw: boolean, isPlaying: boolean) {
        // Draw beat data in each frame
        this.updateStageStyleFunc(videoWidth, videoHeight);
        // find TrackingPoints to draw at the current frame
        this.ApplicationState.levelData.Moves.forEach((move: Move) => {
            move.MoveActions.forEach(moveAction => {
                let startFrame: number = move.MoveActions[0].TrackingPoints[0].Frame;
                let endFrame: number = move.MoveActions[0].TrackingPoints[0].Frame;

                move.MoveActions.forEach(m => {
                    m.TrackingPoints.forEach(p => {
                        if (p.Frame <= startFrame) {
                            startFrame = p.Frame;
                        }
                        if (p.Frame >= endFrame) {
                            endFrame = p.Frame;
                        }
                    });
                });

                if (moveAction.TrackingPoints.length === 1) {
                    const holdTime = moveAction.TrackingPoints[0].HoldTime ? moveAction.TrackingPoints[0].HoldTime : 2;
                    endFrame = moveAction.TrackingPoints[0].Frame + (this.ApplicationState.levelData.VideoInfo.FrameRate * holdTime);
                }

                if (startFrame <= currentFrame && currentFrame <= endFrame) {
                    // we need to check forceToRedraw in case we want to re-draw on the current frame that already drew
                    if (forceToRedraw) { // TODO: remove forceToRedraw. We always force to redraw
                        if (isPlaying || (this.ApplicationState.currentMove && this.ApplicationState.currentMove.ID === move.ID)) {
                            this.destroyCircles(moveAction);
                            this.drawMoveAction(moveAction, videoWidth, videoHeight);
                        } else {
                            this.destroyCircles(moveAction);
                        }
                    } else {
                        if (isPlaying || (this.ApplicationState.currentMove && this.ApplicationState.currentMove.ID === move.ID)) {
                            this.destroyCircles(moveAction);
                            this.drawMoveAction(moveAction, videoWidth, videoHeight);
                        } else {
                            this.destroyCircles(moveAction);
                        }
                    }
                } else {
                    this.destroyCircles(moveAction);
                }
            });
        });


    }

    destroyOrphanPoints(trackingPointIDs: Array<string>) {
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

    private destroyCircles(p: MoveAction) {
        if (!this.trackMoveActions[p.ID]) {
            return;
        }

        const trackDrawingMoveAction = this.trackMoveActions[p.ID];
        if (trackDrawingMoveAction.Circles && trackDrawingMoveAction.Circles.length > 0) {
            trackDrawingMoveAction.Circles.forEach(c => c.destroy());
        }

        if (trackDrawingMoveAction.ScoreRadiusCircles && trackDrawingMoveAction.ScoreRadiusCircles.length > 0) {
            trackDrawingMoveAction.ScoreRadiusCircles.forEach(c => c.destroy());
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
        if (this.frameData.normalizedFrames && this.frameData.normalizedFrames.length > 0) {
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
}