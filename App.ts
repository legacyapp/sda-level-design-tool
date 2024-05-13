import { LevelData, Move, FrameData, DrawingTrackingPoints, DrawingLandmarks, TrackingPoint, MoveAction } from "./Beat";
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
    MOVE_DETAIL_ACTION_ADDED,
    MOVE_DETAIL_ACTION_UPDATED,
    MOVE_DETAIL_ACTION_DELETED,
    MOVE_DETAIL_TRACKINGPOINT_UPDATED,
    MOVE_DETAIL_TRACKINGPOINT_DELETED,
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
    drawingTrackingPoint: DrawingTrackingPoints;
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

        this.drawingTrackingPoint = new DrawingTrackingPoints({ ContainerId: "beat_canvas" }, this.applicationState.levelData, this.notify.bind(this));
        this.drawingLandmarks = new DrawingLandmarks(
            { ContainerId: "pose_canvas" }, this.applicationState.levelData, this.applicationState.frameData);

        this.playerUIController.setVideoFrameCallback(this.drawingTrackingPoint.draw.bind(this.drawingTrackingPoint));
        this.playerUIController.setVideoFrameCallback(this.drawingLandmarks.draw.bind(this.drawingLandmarks));

        // Render UI
        this.levelUIController = new LevelUIController(this.applicationState, this.notify.bind(this));
        this.levelUIController.render();

        const self = this;
        $("#save").on("click", function (event) {
            const jsonString = JSON.stringify(self.applicationState.levelData, null, 2);
            // Copy the JSON string to the clipboard
            navigator.clipboard.writeText(jsonString)
                .then(() => {
                    console.log('JSON string copied to clipboard');
                    console.log(jsonString);
                })
                .catch(err => {
                    alert('ERROR copying JSON string to clipboard:' + err);
                    console.error('Error copying JSON string to clipboard:', err);
                });
        });
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

            case Message.MOVES_ITEM_ADDED:
                {
                    this.playerUIController.pause();
                    const [currentFrame, currentTime] = this.playerUIController.getCurrentFrameAndTime();
                    const newMove = Move.build(currentFrame, currentTime);
                    this.applicationState.currentMove = newMove;
                    this.applicationState.levelData.Moves.push(newMove);
                    this.applicationState.levelData.sort();
                    this.levelUIController.render();
                    this.levelUIController.focusOnMove(newMove);
                }
                break;

            case Message.MOVES_ITEM_DELETED:
                {
                    this.playerUIController.pause();
                    const move = data as Move;
                    if (this.applicationState.currentMove && move.ID === this.applicationState.currentMove.ID) {
                        this.applicationState.currentMove = undefined;
                    }

                    let indexToRemove = 0;
                    for (let i = 0; i < this.applicationState.levelData.Moves.length; i++) {
                        if (this.applicationState.levelData.Moves[i].ID === move.ID) {
                            indexToRemove = i;
                            break;
                        }
                    }
                    this.applicationState.levelData.Moves.splice(indexToRemove, 1);
                    console.log(this.applicationState.levelData);
                }
                break;

            case Message.MOVE_DETAIL_ACTION_UPDATED:
                {
                    this.playerUIController.pause();
                    const [currentFrame] = this.playerUIController.getCurrentFrameAndTime();
                    const size = this.playerUIController.getContainerSize();
                    const moveAction = data as MoveAction;
                    const trackingPoint = moveAction.TrackingPoints[moveAction.TrackingPoints.length - 1];
                    trackingPoint.Frame = currentFrame;
                    trackingPoint.Time = currentFrame / this.applicationState.levelData.VideoInfo.FrameRate;
                    this.drawingTrackingPoint.draw(currentFrame, size.width, size.height, true);
                }
                break;

            case Message.MOVE_DETAIL_ACTION_ADDED:
                {
                    this.playerUIController.pause();
                    const [currentFrame, currentTime] = this.playerUIController.getCurrentFrameAndTime();
                    const size = this.playerUIController.getContainerSize();
                    const moveAction = data as MoveAction;
                    moveAction.TrackingPoints.forEach(p => {
                        p.Frame = currentFrame;
                        p.Time = currentTime;
                    });
                    this.drawingTrackingPoint.draw(currentFrame, size.width, size.height);
                }
                break;

            case Message.MOVE_DETAIL_ACTION_DELETED:
                {
                    this.playerUIController.pause();
                    const moveAction = data as MoveAction;
                    this.drawingTrackingPoint.destroyOrphanPoints(moveAction.TrackingPoints.map(p => p.ID));
                }
                break;

            case Message.MOVE_DETAIL_TRACKINGPOINT_UPDATED:
                {
                    this.playerUIController.pause();
                    const trackingPoint = data as TrackingPoint;
                    if (trackingPoint.Frame) {
                        this.playerUIController.setCurrentFrame(trackingPoint.Frame);
                    }
                }
                break;

            case Message.MOVE_DETAIL_TRACKINGPOINT_DELETED:
                {
                    this.playerUIController.pause();
                    const trackingPoint = data as TrackingPoint;
                    this.drawingTrackingPoint.destroyOrphanPoints([trackingPoint.ID]);
                }
                break;

            case Message.PLAYER_TRACKINGPOINT_UPDATE:
                {
                    this.playerUIController.pause();
                    let trackingPoint: TrackingPoint;
                    this.applicationState.levelData.Moves.forEach(m => {
                        if (trackingPoint) {
                            return;
                        }
                        m.MoveActions.forEach(ma => {
                            trackingPoint = ma.TrackingPoints.find(p => p.ID === data.Id);
                            if (trackingPoint) {
                                return;
                            }
                        });
                    });

                    const size = this.playerUIController.getContainerSize();
                    trackingPoint.Pos.X = data.Position.x / size.width;
                    trackingPoint.Pos.Y = data.Position.y / size.height;

                    this.levelUIController.updateTrackingPointUI(trackingPoint);
                }
                break;

            default:
                break;
        }
    }
}