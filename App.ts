import { LevelData, Move, FrameData, DrawingBeats, DrawingLandmarks, TrackingPoint } from "./Beat";
import Handlebars from "handlebars";
import { PlayerWrapper as PlayerUIController } from "./Player";
import { LevelUIController } from "./Level";
import $ from "jquery";
import { deepGet } from "./util";

export interface NotifyDelegate {
    (message: Message, data: any): void;
}

export enum Message {
    MOVES_ITEM_CLICKED,
    MOVES_ITEM_ADDED,
    MOVES_ITEM_DELETED,
    MOVE_DETAIL_UPDATED,
    MOVE_DETAIL_TRACKINGPOINT_UPDATED,
    PLAYER_TRACKINGPOINT_UPDATE
}

export class ApplicationState {
    levelData: LevelData;
    frameData: FrameData;
    currentMove: Move;

    constructor(frameData, levelData) {
        this.frameData = frameData;
        this.levelData = levelData;
    }
}

export class App {
    private applicationState: ApplicationState;

    playerUIController: PlayerUIController;
    drawingBeats: DrawingBeats;
    drawingLandmarks: DrawingLandmarks;
    levelUIController: LevelUIController;

    public Init() {
        Handlebars.registerHelper("increment", function (val) {
            return val + 1;
        });

        Handlebars.registerHelper('select', function (value, options) {
            const $el = $('<select />').html(options.fn(this));
            $el.find('[value="' + value + '"]').attr({ 'selected': 'selected' });
            return $el.html();
        });

        Handlebars.registerHelper('checked', function (value) {
            return value ? 'checked' : '';
        });

        Handlebars.registerHelper('radioChecked', function (value, test) {
            if (value == undefined) return '';
            return value == test ? 'checked' : '';
        });

        Handlebars.registerHelper('json', function (value) {
            return JSON.stringify(value);
        });

        Handlebars.registerHelper('isLengthLargerThanOrEqual', function (value, test) {
            return value.length >= test;
        });

        Handlebars.registerHelper('getArrayItem', function (array, index, path) {
            if (!path || path.length === 0) {
                return array[index];
            }

            return deepGet(array[index], path);
        });
    }

    public run(applicationState: ApplicationState) {
        this.applicationState = applicationState;

        this.playerUIController = new PlayerUIController(
            {
                ContainerId: "my-player",
                VideoPlayerOption: {
                    controls: true,
                    //autoplay: true,
                    width: 1080,
                    height: 1920,
                    fluid: true,
                    fill: true,
                    //responsive: true
                },
                InitVideoSource: this.applicationState.levelData.VideoInfo.VideoUrl,
                VideoFrameRate: 30
            }
        );

        this.drawingBeats = new DrawingBeats({ ContainerId: "beat_canvas" }, this.applicationState.levelData, this.notify.bind(this));
        this.drawingLandmarks = new DrawingLandmarks(
            { ContainerId: "pose_canvas" }, this.applicationState.levelData, this.applicationState.frameData);

        this.playerUIController.setVideoFrameCallback(this.drawingBeats.draw.bind(this.drawingBeats));
        this.playerUIController.setVideoFrameCallback(this.drawingLandmarks.draw.bind(this.drawingLandmarks));

        // Render UI
        this.levelUIController = new LevelUIController(this.applicationState, this.notify.bind(this));
        this.levelUIController.render();
    }

    public notify(message: Message, data: any) {
        switch (message) {
            case Message.MOVES_ITEM_CLICKED:
                {
                    const move = data as Move;
                    this.playerUIController.setCurrentFrame(move.StartFrame);
                    this.applicationState.currentMove = move;
                }
                break;

            case Message.MOVE_DETAIL_TRACKINGPOINT_UPDATED:
                {
                    const trackingPoint = data as TrackingPoint;
                    if (trackingPoint.Frame) {
                        this.playerUIController.setCurrentFrame(trackingPoint.Frame);
                    }
                }
                break;


            case Message.PLAYER_TRACKINGPOINT_UPDATE:
                {
                    const currentMove = this.applicationState.currentMove;
                    const trackingPoint = currentMove.MoveActions.flatMap(p => p.TrackingPoints).find(b => b.ID === data.Id);
                    const size = this.playerUIController.getContainerSize();
                    trackingPoint.Pos.X = data.Position.x / size.width;
                    trackingPoint.Pos.Y = data.Position.y / size.height;

                    this.levelUIController.updateTrackingPointUI(trackingPoint);
                    console.log(trackingPoint);
                }
                break;

            default:
                break;
        }
    }
}