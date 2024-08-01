import { LevelData, Move, FrameData, DrawingTrackingPoints, DrawingLandmarks, TrackingPoint, MoveAction, VideoInfo } from "./Beat";
import Handlebars from "handlebars";
import { PlayerWrapper as PlayerUIController } from "./Player";
import { LevelUIController } from "./Level";
import $ from "jquery";
import { deepGet, MessageTypes } from "./util";
import { Database } from "./Db";
import { NormalizedLandmarks } from "./Converter";
import toastr from "toastr";
import { MainTabsUIController } from "./Tab";
import { SettingsUIController } from "./Settings";
import { CloneSongRequest, ParentChildMessage } from "./Models";
import { Modal } from 'flowbite'

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
    MOVE_DETAIL_TRACKINGPOINT_ADDED,
    MOVE_DETAIL_TRACKINGPOINT_UPDATED,
    MOVE_DETAIL_TRACKINGPOINT_DELETED,
    PLAYER_TRACKINGPOINT_UPDATE,
    PLAYER_TRACKINGPOINT_MOUSEOVER,
    PLAYER_TRACKINGPOINT_MOUSEOUT,
    PLAYER_TRACKINGPOINT_CLICK,
    SETTING_FRAME_ADJUST_UPDATED
}

export class ApplicationState {
    levelData: LevelData;
    frameData: FrameData;
    currentMove: Move;
    isPlaying: boolean = false;

    constructor(frameData, levelData) {
        this.frameData = frameData;
        this.levelData = levelData;
    }
}

export class App {
    private applicationState: ApplicationState;

    public CurrentDocumentId: string;
    public AllLevelDatas;
    public SongDataConfig;

    playerUIController: PlayerUIController;
    drawingTrackingPoint: DrawingTrackingPoints;
    drawingLandmarks: DrawingLandmarks;
    levelUIController: LevelUIController;
    mainTabsUIController: MainTabsUIController;
    settingsUIController: SettingsUIController;

    cloneModal: Modal;

    database: Database;

    async loadAllLevelDatas() {
        const data = await this.database.getAllLevelDatas();

        this.AllLevelDatas = data;

        return data;
    }

    async getJson(jsonUrl: string) {
        const json = await this.database.getJson(jsonUrl);

        // Do other things?

        return json;
    }

    saveLevelData() {
        return this.database.saveLevelData(this.CurrentDocumentId, this.applicationState.levelData);
    }

    async loadBeatDataFromOldDatabase(videoBeat, frameData) {
        NormalizedLandmarks(frameData);

        const levelData: LevelData = new LevelData();
        const videoInfo: VideoInfo = new VideoInfo();

        videoInfo.FrameRate = frameData.frame_rate;
        videoInfo.Height = frameData.size[0];
        videoInfo.Width = frameData.size[1];
        videoInfo.VideoUrl = videoBeat.danceVideo.videoUrl;
        levelData.VideoInfo = videoInfo;

        return {
            FrameData: frameData,
            LevelData: levelData
        }
    }

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

        this.database = new Database();
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
                    //responsive: true,
                    playbackRates: [0.1, 0.25, 0.5, 1, 1.5, 2],
                    inactivityTimeout: 0
                },
                InitVideoSource: this.applicationState.levelData.VideoInfo.VideoUrl,
                VideoFrameRate: this.applicationState.levelData.VideoInfo.FrameRate
            }
        );

        this.drawingTrackingPoint = new DrawingTrackingPoints({ ContainerId: "beat_canvas" }, this.applicationState, this.notify.bind(this));
        this.drawingLandmarks = new DrawingLandmarks(
            { ContainerId: "pose_canvas" }, this.applicationState.levelData, this.applicationState.frameData);

        this.playerUIController.setVideoFrameCallback(this.drawingTrackingPoint.draw.bind(this.drawingTrackingPoint));
        this.playerUIController.setVideoFrameCallback(this.drawingLandmarks.draw.bind(this.drawingLandmarks));

        // Tabs UI
        this.mainTabsUIController = new MainTabsUIController(this.applicationState);
        this.mainTabsUIController.render();

        // Render UI
        this.levelUIController = new LevelUIController(this.applicationState, this.notify.bind(this));
        this.levelUIController.render();
        this.playerUIController.setVideoFrameCallback(this.levelUIController.videoFrameCallback.bind(this.levelUIController));

        // Settings UI
        this.settingsUIController = new SettingsUIController(this.applicationState, this.notify.bind(this));
        this.settingsUIController.render();

        const self = this;
        $("#save").off("click");
        $("#save").on("click", function (event) {
            $("#loading-screen").removeClass("hidden");

            const messageToParent: ParentChildMessage = {
                type: MessageTypes.ChildSave,
                data: self.applicationState.levelData
            }
            window.parent.postMessage(messageToParent, '*');

            self.saveLevelData().then(result => {
                $("#loading-screen").addClass("hidden");
                toastr.success("Saved Level Data to Firebase Successfully.");
            });
        });

        this.cloneModal = new Modal(document.querySelector('#cloneSongModal'));
        $("#showCloneModal").off("click");
        $("#showCloneModal").on("click", function (event) {
            $("#targetSongId").val(self.applicationState.levelData.ID + " Clone");
            $("#targetSongName").val($("#videoSelection option:selected").text() + " Clone");
            self.cloneModal.toggle()
        });

        $("#clone").off("click");
        $("#clone").on("click", function (event) {
            $("#loading-screen").removeClass("hidden");

            const messageToParent: ParentChildMessage = {
                type: MessageTypes.ChildClone,
                data: new CloneSongRequest(self.applicationState.levelData.ID, $("#targetSongId").val() as string, {
                    "info.songTitle": $("#targetSongName").val()
                })
            }
            window.parent.postMessage(messageToParent, '*');
        });

        $("#closeModal").off("click");
        $("#closeModal").on("click", function (event) {
            self.cloneModal.hide();
        });


        $("#loading-screen").addClass("hidden");
    }

    public notify(message: Message, data: any) {
        switch (message) {
            case Message.MOVE_DETAIL_UPDATED:
                {
                    const move = data as Move;
                    this.applicationState.currentMove = move;
                    const [currentFrame] = this.playerUIController.getCurrentFrameAndTime();
                    this.playerUIController.setCurrentFrame(currentFrame);
                }
                break;
            case Message.MOVES_ITEM_CLICKED:
                {
                    const move = data as Move;
                    this.applicationState.currentMove = move;
                    this.playerUIController.setCurrentFrame(move.StartFrame);
                }
                break;

            case Message.MOVES_ITEM_ADDED:
                {
                    this.playerUIController.pause();
                    const [currentFrame, currentTime] = this.playerUIController.getCurrentFrameAndTime();
                    let newMove = data as Move;
                    if (!newMove) {
                        newMove = Move.build(currentFrame, currentTime);
                    }
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
                    const [currentFrame] = this.playerUIController.getCurrentFrameAndTime();
                    this.playerUIController.setCurrentFrame(currentFrame);
                }
                break;

            case Message.MOVE_DETAIL_TRACKINGPOINT_ADDED:
                {
                    this.playerUIController.pause();
                    const [currentFrame] = this.playerUIController.getCurrentFrameAndTime();
                    const size = this.playerUIController.getContainerSize();
                    const moveAction = data as MoveAction;
                    const trackingPoint = moveAction.TrackingPoints[moveAction.TrackingPoints.length - 1];
                    trackingPoint.Frame = currentFrame;
                    trackingPoint.Time = currentFrame / this.applicationState.levelData.VideoInfo.FrameRate;
                    this.drawingTrackingPoint.draw(currentFrame, size.width, size.height, true, this.playerUIController.isPlaying);
                    this.levelUIController.renderMaxScore();
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
                    this.drawingTrackingPoint.draw(currentFrame, size.width, size.height, false, this.playerUIController.isPlaying);
                    this.levelUIController.renderMaxScore();
                }
                break;

            case Message.MOVE_DETAIL_ACTION_UPDATED:
                {
                    this.playerUIController.pause();
                    const [currentFrame] = this.playerUIController.getCurrentFrameAndTime();
                    const size = this.playerUIController.getContainerSize();
                    this.drawingTrackingPoint.draw(currentFrame, size.width, size.height, true, this.playerUIController.isPlaying);
                    this.levelUIController.renderMaxScore();
                }
                break;

            case Message.MOVE_DETAIL_ACTION_DELETED:
                {
                    this.playerUIController.pause();
                    const [currentFrame] = this.playerUIController.getCurrentFrameAndTime();
                    this.playerUIController.setCurrentFrame(currentFrame);
                    this.levelUIController.renderMaxScore();
                }
                break;

            case Message.MOVE_DETAIL_TRACKINGPOINT_UPDATED:
                {
                    this.playerUIController.pause();
                    const trackingPoint = data as TrackingPoint;
                    if (trackingPoint.Frame >= 0) {
                        this.playerUIController.setCurrentFrame(trackingPoint.Frame);
                    }
                    this.levelUIController.renderMaxScore();
                }
                break;

            case Message.MOVE_DETAIL_TRACKINGPOINT_DELETED:
                {
                    this.playerUIController.pause();
                    const trackingPoint = data as TrackingPoint;
                    //this.drawingTrackingPoint.destroyOrphanPoints([trackingPoint.ID]);
                    const [currentFrame] = this.playerUIController.getCurrentFrameAndTime();
                    this.playerUIController.setCurrentFrame(currentFrame);
                    this.levelUIController.renderMaxScore();
                }
                break;

            case Message.PLAYER_TRACKINGPOINT_UPDATE:
                {
                    this.playerUIController.pause();
                    let trackingPoint: TrackingPoint = this.applicationState.levelData.getTrackingPoint(data.Id);
                    const size = this.playerUIController.getContainerSize();
                    trackingPoint.Pos.X = data.Position.x / size.width;
                    trackingPoint.Pos.Y = data.Position.y / size.height;

                    this.levelUIController.updateTrackingPointUI(trackingPoint);
                    this.levelUIController.renderMaxScore();
                }
                break;

            case Message.PLAYER_TRACKINGPOINT_MOUSEOVER:
                {
                    const trackingPointId = data as string;
                    $("#trackingPoint-" + trackingPointId).addClass("bg-gray-200");
                }
                break;
            case Message.PLAYER_TRACKINGPOINT_MOUSEOUT:
                {
                    const trackingPointId = data as string;
                    $("#trackingPoint-" + trackingPointId).removeClass("bg-gray-200");
                }
                break;
            case Message.PLAYER_TRACKINGPOINT_CLICK:
                {
                    // TODO: comment this because it's a nice idea but mouse will change position

                    const trackingPointId = data as string;
                    const element = document.getElementById("trackingPoint-" + trackingPointId);
                    element && element.scrollIntoView({
                        behavior: 'auto',
                        block: 'center',
                        inline: 'center'
                    });
                }
                break;
            case Message.SETTING_FRAME_ADJUST_UPDATED:
                {
                    this.playerUIController.pause();
                    const frame = data as number;
                    if (frame >= 0) {
                        this.playerUIController.setCurrentFrame(frame);
                    }
                }
                break;
            default:
                break;
        }
    }
}