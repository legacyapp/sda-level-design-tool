import { Move, MoveAction, TrackingPoint } from "./Beat";
import Handlebars from "handlebars";
import $ from "jquery";
import { ApplicationState, Message, NotifyDelegate } from "./App";
import { deepGet, deepSet, parseNumber } from "./util";
import toastr from "toastr"

const BG_HIGHLIGHT_PLAYING = "bg-gray-200";
const BG_MOVE_CLICKED = "bg-gray-300";

export class LevelUIController {
    private applicationState: ApplicationState;
    private notify: NotifyDelegate;

    constructor(applicationState: ApplicationState, notify: NotifyDelegate) {
        this.applicationState = applicationState;
        this.notify = notify;
        $("#allMoves").empty();
        $("#moveDetailForm").addClass("hidden");
        $("#addNewAction").addClass("hidden");
    }

    private renderMoveList() {
        if (this.applicationState.levelData.Moves.length > 0) {
            const source = $("#movesTemplate").html();
            const template = Handlebars.compile(source);
            const html = template(this.applicationState.levelData);

            $("#allMoves").off("click", "li");
            $("#allMoves").empty();
            $("#allMoves").html(html);

            const self = this;
            // Attach click event handler to each move item
            $("#allMoves").on("click", "li", function () {
                const moveId = $(this).data("id");
                const move = self.applicationState.levelData.Moves.find(m => m.ID === moveId);
                self.renderMoveDetail(move);

                // Remove class that added when played video
                $("#allMoves li").removeClass(BG_HIGHLIGHT_PLAYING);

                // Remove previous clicked item style and add style to new clicked item
                $("#allMoves li").removeClass(BG_MOVE_CLICKED);
                $(this).addClass(BG_MOVE_CLICKED);

                // Show Move Detail Form;
                $("#moveDetailForm").removeClass("hidden");
                $("#addNewAction").removeClass("hidden");
                self.notify(Message.MOVES_ITEM_CLICKED, move);
            });

            $(".deleteMove").on("click", function (event) {
                event.stopPropagation();
                const moveId = $(this).data("id");
                const move = self.applicationState.levelData.Moves.find(m => m.ID === moveId);

                self.notify(Message.MOVES_ITEM_DELETED, move);

                if (!self.applicationState.currentMove || self.applicationState.currentMove.ID === moveId) {
                    $("#moveDetailForm").addClass("hidden");
                    $("#addNewAction").addClass("hidden");
                }

                $("#" + moveId).remove();
                if (!self.applicationState.levelData.Moves || self.applicationState.levelData.Moves.length === 0) {
                    $("#moveDetailForm").addClass("hidden");
                    $("#addNewAction").addClass("hidden");
                }
                toastr.success("Delete Move Successfully.");
            });
        }
    }

    renderMoveDetail(move: Move) {
        $("#moveName").val(move.Name);
        $("#moveStartTime").val(move.StartTime);
        $("#moveEndTime").val(move.EndTime);
        $("#moveStartFrame").val(move.StartFrame);
        $("#moveEndFrame").val(move.EndFrame);
        $("#moveDetailIsShowScoreRadius").prop("checked", move.IsShowScoreRadius);

        // clean before render new tracking points
        $("#moveName").off("input");
        $("#actions").off("input", "input");
        $("#actions").off("change", "select");
        $("#actions").off("change", "input");
        $("#moveDetailHeader").off("change", "input");
        $("#actions").off("click", ".deleteTrackingPoint");
        $("#addNewAction").off("click");
        $(".add-tracking-point").off("click");
        $(".sort-tracking-point").off("click");
        $(".deleteAction").off("click");
        $("#actions #decrement-button").off("click");
        $("#actions #increment-button").off("click");

        const self = this;
        $("#moveName").on("input", function (event: JQuery.TriggeredEvent) {
            self.applicationState.currentMove.Name = event.target.value;
            $("#" + self.applicationState.currentMove.ID + "-Name").text(self.applicationState.currentMove.Name);
        });

        // TODO Should we do not register for each render move detail???
        Handlebars.registerPartial("trackingPointsTemplate", $("#trackingPointsTemplate").html());
        Handlebars.registerPartial("anActionTemplate", $("#anActionTemplate").html());
        Handlebars.registerPartial("aTrackingPointTemplate", $("#aTrackingPointTemplate").html());

        // Render tracking points
        const source = $("#actionsTemplate").html();
        const template = Handlebars.compile(source);

        const html = template(move);
        $("#actions").html(html);

        this.handAddNewTrackingPoint(move, self);
        this.handleAddNewAction(move, self);
        this.handleDeleteMoveAction(self, ".deleteAction");
        this.handleInputEvent(self, "#actions"); // Handle all "input" event of all actions inputs
        this.handleDeleteTrackingPointEvent(self, "#actions");
        this.handleChangeEvent(self, "#actions"); // Handle change event of radio and select inputs
        this.handleChangeEvent(self, "#moveDetailHeader");
        this.handleIncrementDecrementClickEvent(self, "#actions #decrement-button", "value-change-step", -1);
        this.handleIncrementDecrementClickEvent(self, "#actions #increment-button", "value-change-step", 1);
    }

    private handleIncrementDecrementClickEvent(self: this, containerSelector: string, stepAttrName: string, factor: number) {
        $(containerSelector).on("click", function (event) {
            const input = factor > 0 ? $(this).prev() : $(this).next();
            const step = parseNumber($(input).data(stepAttrName));

            if (input && step) {
                const trackingPoint = self.applicationState.currentMove.MoveActions.flatMap(p => p.TrackingPoints).find(b => b.ID === input.data("id"));

                if (trackingPoint) {
                    // update the trackingPoint object and other dependencies
                    let newValue = deepGet(trackingPoint, input.data("path")) + (factor * step);
                    newValue = newValue || 0;
                    deepSet(trackingPoint, input.data("path"), newValue);
                    input.val(newValue);

                    if (input.data("path") === "Frame") {
                        trackingPoint.Time = trackingPoint.Frame / self.applicationState.levelData.VideoInfo.FrameRate;
                        $("#" + trackingPoint.ID + "-Time").val(trackingPoint.Time);
                    }

                    if (input.data("path") === "Time") {
                        trackingPoint.Frame = Math.round(trackingPoint.Time * self.applicationState.levelData.VideoInfo.FrameRate);
                        $("#" + trackingPoint.ID + "-Frame").val(trackingPoint.Frame);
                    }

                    // notify other component to do something when we update a tracking point
                    self.notify(Message.MOVE_DETAIL_TRACKINGPOINT_UPDATED, trackingPoint);
                } else {
                    const moveAction = self.applicationState.currentMove.MoveActions.find(m => m.ID === $(input).data("id"));
                    let newValue = deepGet(moveAction, input.data("path")) + (factor * step);
                    newValue = newValue || 0;
                    deepSet(moveAction, input.data("path"), newValue);
                    input.val(newValue);
                    self.notify(Message.MOVE_DETAIL_ACTION_UPDATED, moveAction);
                }

                // update start/end frame/time of move detail
                self.updateMoveDetail();
            }
        });
    }

    private handleChangeEvent(self: this, containerSelector: string) {
        $(containerSelector).on("change", "select", function (event) {
            const currentMove = self.applicationState.currentMove;
            const moveAction = currentMove.MoveActions.find(m => m.ID === $(this).data("id"));
            moveAction.Joint = parseInt($(this).val());
            self.notify(Message.MOVE_DETAIL_ACTION_UPDATED, moveAction);
        });

        $(containerSelector).on("change", "input", function (event) {
            const currentMove = self.applicationState.currentMove;
            const moveAction = currentMove.MoveActions.find(m => m.ID === $(this).data("id"));
            const trackingPoint = currentMove.MoveActions.flatMap(p => p.TrackingPoints).find(b => b.ID === $(this).data("id"));
            if ($(this).data("path") === "IsMajor") {
                moveAction.IsMajor = this.checked;
            }
            if ($(this).data("path") === "IsShowScoreRadius") {
                if (moveAction) {
                    moveAction.IsShowScoreRadius = this.checked;
                    self.notify(Message.MOVE_DETAIL_ACTION_UPDATED, moveAction);
                    return;
                }

                if (trackingPoint) {
                    trackingPoint.IsShowScoreRadius = this.checked;
                    self.notify(Message.MOVE_DETAIL_TRACKINGPOINT_UPDATED, trackingPoint);
                    return;
                }

                if (currentMove) {
                    currentMove.IsShowScoreRadius = this.checked;
                    self.notify(Message.MOVE_DETAIL_UPDATED, currentMove);
                    return;
                }
            }
        });
    }

    private handleAddNewAction(move: Move, self: this) {
        $("#addNewAction").on("click", function (event) {
            const newMoveAction = MoveAction.build(0, 0);
            newMoveAction.Index = move.MoveActions.length;
            move.MoveActions.push(newMoveAction);

            self.notify(Message.MOVE_DETAIL_ACTION_ADDED, newMoveAction);
            // update start/end frame/time of move detail
            self.updateMoveDetail();

            const source = $("#anActionTemplate").html();
            const template = Handlebars.compile(source);
            const html = template(newMoveAction);
            $("#actionList").append(html);

            $(".add-tracking-point").off("click");
            $(".sort-tracking-point").off("click");
            self.handAddNewTrackingPoint(move, self);

            $(".deleteAction").off("click");
            self.handleDeleteMoveAction(self, ".deleteAction");

            $("#actions #decrement-button").off("click");
            $("#actions #increment-button").off("click");
            self.handleIncrementDecrementClickEvent(self, "#actions #decrement-button", "value-change-step", -1);
            self.handleIncrementDecrementClickEvent(self, "#actions #increment-button", "value-change-step", 1);

            toastr.success("Added New Action Successfully.");

            const element = document.getElementById("MoveAction-" + newMoveAction.ID);
            element && element.scrollIntoView({
                behavior: 'auto',
                block: 'center',
                inline: 'center'
            });
        });
    }

    private handleDeleteMoveAction(self: this, containerSelector: string) {
        $(containerSelector).on("click", function (event) {
            const currentMove = self.applicationState.currentMove;
            if (currentMove.MoveActions.length === 1) {
                toastr.error("ERROR: cannot delete the last move action of a Move");
                return;
            }
            const moveAction = currentMove.MoveActions.find(m => m.ID === $(this).data("id"));
            if (moveAction) {
                currentMove.MoveActions = currentMove.MoveActions.filter(p => p.ID !== moveAction.ID);
                $("#MoveAction-" + moveAction.ID).remove();
                self.notify(Message.MOVE_DETAIL_ACTION_DELETED, moveAction);
            }
            toastr.success("Deleted Move Action Successfully.");
        });
    }

    private handleDeleteTrackingPointEvent(self: this, containerSelector: string) {
        $(containerSelector).on("click", ".deleteTrackingPoint", function (event) {
            const trackingPointId = $(this).data("id");
            const currentMove = self.applicationState.currentMove;
            for (let i = 0; i < currentMove.MoveActions.length; i++) {
                const trackingPoint = currentMove.MoveActions[i].TrackingPoints.find(b => b.ID === trackingPointId);
                if (trackingPoint) {
                    if (currentMove.MoveActions[i].TrackingPoints.length === 1) {
                        toastr.error("ERROR: cannot delete the last tracking point of an Action");
                        return;
                    }

                    currentMove.MoveActions[i].TrackingPoints = currentMove.MoveActions[i].TrackingPoints.filter(p => p.ID !== trackingPointId);

                    $("#trackingPoint-" + trackingPoint.ID).remove();
                    self.notify(Message.MOVE_DETAIL_TRACKINGPOINT_DELETED, trackingPoint);
                    return;
                }
            }
            toastr.success("Deleted Tracking Point Successfully.");
        });
    }

    private handAddNewTrackingPoint(move: Move, self: this) {
        $(".add-tracking-point").on("click", function (event) {
            const moveActionID = $(this).data("id");
            const moveAction = move.MoveActions.find(m => m.ID === moveActionID);
            const trackingPoint = TrackingPoint.build(0, 0, moveAction.TrackingPoints.length);
            moveAction.TrackingPoints.push(trackingPoint);

            self.notify(Message.MOVE_DETAIL_TRACKINGPOINT_ADDED, moveAction);
            // update start/end frame/time of move detail
            self.updateMoveDetail();

            const source = $("#aTrackingPointTemplate").html();
            const template = Handlebars.compile(source);
            const html = template(trackingPoint);
            $("#trackingPoints-" + moveActionID).append(html);
            self.handleInputEvent(self, "#trackingPointID-" + trackingPoint.ID);
            $("#actions").off("click", ".deleteTrackingPoint");
            $("#actions #decrement-button").off("click");
            $("#actions #increment-button").off("click");
            self.handleDeleteTrackingPointEvent(self, "#actions");
            self.handleIncrementDecrementClickEvent(self, "#actions #decrement-button", "value-change-step", -1);
            self.handleIncrementDecrementClickEvent(self, "#actions #increment-button", "value-change-step", 1);
            toastr.success("Added New Tracking Point Successfully.");
        });

        $(".sort-tracking-point").on("click", function (event) {
            const moveActionID = $(this).data("id");
            const moveAction = move.MoveActions.find(m => m.ID === moveActionID);
            moveAction.TrackingPoints.sort((a, b) => {
                if (!(typeof a.Index === 'number' && a.Index > 0)) {
                    a.Index = 0;
                }

                if (!(typeof b.Index === 'number' && b.Index > 0)) {
                    b.Index = 0;
                }

                return a.Index - b.Index;
            });
            self.renderMoveDetail(self.applicationState.currentMove)
        });
    }

    private handleInputEvent(self: this, containerSelector: string) {
        $(containerSelector).on("input", "input", function (event) {
            const input = $(this);
            const currentMove = self.applicationState.currentMove;
            const trackingPoint = currentMove.MoveActions.flatMap(p => p.TrackingPoints).find(b => b.ID === input.data("id"));

            // update Move Detail
            if (!trackingPoint) {
                const currentMove = self.applicationState.currentMove;
                const moveAction = currentMove.MoveActions.find(m => m.ID === $(this).data("id"));
                const path = $(this).data("path");
                if (path === "Name") {
                    moveAction.Name = $(this).val();
                }
                else if (path === "ScoresRadius") {
                    try {
                        let scoreRadius;
                        if (!$(this).val()!) {
                            scoreRadius = [];
                        } else {
                            scoreRadius = JSON.parse($(this).val());
                        }
                        moveAction.ScoresRadius = scoreRadius;
                        self.notify(Message.MOVE_DETAIL_ACTION_UPDATED, moveAction);
                    }
                    catch (e) {
                        toastr.error("ERROR: Invalid Scores Radius values");
                    }
                }


            } else {
                // update the trackingPoint object and other dependencies
                deepSet(trackingPoint, input.data("path"), parseNumber(event.target.value));

                const path = $(this).data("path");
                if (input.data("path") === "Frame") {
                    trackingPoint.Time = trackingPoint.Frame / self.applicationState.levelData.VideoInfo.FrameRate;
                    $("#" + trackingPoint.ID + "-Time").val(trackingPoint.Time);
                }

                if (input.data("path") === "Time") {
                    trackingPoint.Frame = Math.round(trackingPoint.Time * self.applicationState.levelData.VideoInfo.FrameRate);
                    $("#" + trackingPoint.ID + "-Frame").val(trackingPoint.Frame);
                }

                if (path === "ScoresRadius") {
                    try {
                        const scoreRadius = JSON.parse($(this).val());
                        for (let i = 0; i < scoreRadius.length; i++) {
                            if (scoreRadius[i].Radius < 0.01) {
                                throw new Error("Radius must be larger than 0.01");
                            }
                        }
                        trackingPoint.ScoresRadius = scoreRadius;
                    }
                    catch (e) {
                        toastr.error("ERROR: Invalid Scores Radius values");
                    }
                }

                // notify other component to do something when we update a tracking point
                self.notify(Message.MOVE_DETAIL_TRACKINGPOINT_UPDATED, trackingPoint);
                // update start/end frame/time of move detail
                self.updateMoveDetail();
            }
        });
    }

    private updateMoveDetail() {
        const currentMove = this.applicationState.currentMove;
        this.applicationState.currentMove.updateStartAndEndFrameTime();

        // update the Move object of this tracking point in the Move List UI
        $("#" + currentMove.ID + "-StartFrame-EndFrame").text(`From: ${currentMove.StartFrame} - To: ${currentMove.EndFrame}`);
        $("#moveStartFrame").val(currentMove.StartFrame);
        $("#moveEndFrame").val(currentMove.EndFrame);
    }

    render() {
        const self = this;
        $("#addNewMove").off("click");
        $("#addNewMove").on("click", function (event) {
            self.notify(Message.MOVES_ITEM_ADDED, undefined);
            toastr.success("Added New Move Successfully.");
        });

        this.renderMoveList();
    }

    updateTrackingPointUI(trackingPoint: TrackingPoint) {
        $("#" + trackingPoint.ID + "-Pos-X").val(trackingPoint.Pos.X);
        $("#" + trackingPoint.ID + "-Pos-Y").val(trackingPoint.Pos.Y);
    }

    focusOnMove(move: Move) {
        $("#" + move.ID).trigger("click");
    }

    videoFrameCallback(currentFrame: number, videoWidth: number, videoHeight: number) {
        const moves = this.applicationState.levelData.getMoves(currentFrame);
        if (moves && moves.length > 0) {
            moves.forEach(m => {
                $("#allMoves li").removeClass(BG_HIGHLIGHT_PLAYING);
                $("#" + m.ID).addClass(BG_HIGHLIGHT_PLAYING);
                this.scrollIntoViewIfNeeded($("#" + m.ID)[0]);
            });
        } else {
            $("#allMoves li").removeClass(BG_HIGHLIGHT_PLAYING);
        }
    }

    private scrollIntoViewIfNeeded(element) {
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

}

