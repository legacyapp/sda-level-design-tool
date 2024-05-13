import { Move, MoveAction, MovementType, TrackingPoint } from "./Beat";
import Handlebars from "handlebars";
import $ from "jquery";
import { ApplicationState, Message, NotifyDelegate } from "./App";
import { deepGet, deepSet, dropLastN, parseNumber } from "./util";

export class LevelUIController {
    private applicationState: ApplicationState;
    private notify: NotifyDelegate;

    constructor(applicationState: ApplicationState, notify: NotifyDelegate) {
        this.applicationState = applicationState;
        this.notify = notify;
    }

    private renderMoveList() {
        if (this.applicationState.levelData.Moves.length > 0) {
            const source = $("#movesTemplate").html();
            const template = Handlebars.compile(source);
            const html = template(this.applicationState.levelData);
            $("#allMoves").html(html);

            const sefl = this;
            // Attach click event handler to each move item
            $("#allMoves").on("click", "li", function () {
                const moveId = $(this).data("id");
                const move = sefl.applicationState.levelData.Moves.find(m => m.ID === moveId);
                sefl.renderMoveDetail(move);

                // Remove previous clicked item style and add style to new clicked item
                $("#allMoves li").removeClass('bg-gray-300');
                $(this).addClass("bg-gray-300");

                // Show Move Detail Form;
                $("#moveDetailForm").removeClass("hidden");
                sefl.notify(Message.MOVES_ITEM_CLICKED, move);
            });
        }
    }

    renderMoveDetail(move: Move) {
        $("#moveName").val(move.Name);
        $("#moveStartTime").val(move.StartTime);
        $("#moveEndTime").val(move.EndTime);
        $("#moveStartFrame").val(move.StartFrame);
        $("#moveEndFrame").val(move.EndFrame);

        // clean before render new tracking points
        $("#actions").off("input", "input");
        $("#addNewAction").off("click");
        $(".add-tracking-point").off("click");
        $(".deleteTrackingPoint").off("click");

        // TODO Should we do not register for each render move detail???
        Handlebars.registerPartial("trackingPointsTemplate", $("#trackingPointsTemplate").html());
        Handlebars.registerPartial("anActionTemplate", $("#anActionTemplate").html());

        // Render tracking points
        const source = $("#actionsTemplate").html();
        const template = Handlebars.compile(source);

        const html = template(move);
        $("#actions").html(html);

        const sefl = this;

        this.handAddNewTrackingPoint(move, sefl);

        // Add new MoveAction when user clicks to NewMoveAction button
        $("#addNewAction").on("click", function (event) {
            const newMoveAction = MoveAction.build(0, 0);
            newMoveAction.Index = move.MoveActions.length;
            move.MoveActions.push(newMoveAction);

            sefl.notify(Message.MOVE_DETAIL_ACTION_ADDED, newMoveAction);
            // update start/end frame/time of move detail
            sefl.updateMoveDetail();

            const source = $("#anActionTemplate").html();
            const template = Handlebars.compile(source);
            const html = template(newMoveAction);
            $("#actionList").append(html);

            $(".add-tracking-point").off("click");
            sefl.handAddNewTrackingPoint(move, sefl);
        });

        // Handle all "input" event of all actions
        this.handleInputEvent(sefl, "#actions");

        this.handleDeleteTrackingPointEvent(sefl, "#actions");
    }

    private handleDeleteTrackingPointEvent(sefl: this, containerSelector: string) {
        $(containerSelector).on("click", ".deleteTrackingPoint", function (event) {
            const trackingPointId = $(this).data("id");
            console.log(trackingPointId);
            const currentMove = sefl.applicationState.currentMove;
            for (let i = 0; i < currentMove.MoveActions.length; i++) {
                const trackingPoint = currentMove.MoveActions[i].TrackingPoints.find(b => b.ID === trackingPointId);
                if (trackingPoint) {
                    currentMove.MoveActions[i].TrackingPoints = currentMove.MoveActions[i].TrackingPoints.filter(p => p.ID !== trackingPointId);
                    sefl.notify(Message.MOVE_DETAIL_TRACKINGPOINT_DELETED, trackingPoint);
                    return;
                }
            }
        });
    }

    private handAddNewTrackingPoint(move: Move, sefl: this) {
        $(".add-tracking-point").on("click", function (event) {
            const trackingPoint = TrackingPoint.build(0, 0);
            const moveActionID = $(this).data("id");
            const moveAction = move.MoveActions.find(m => m.ID === moveActionID);
            moveAction.TrackingPoints.push(trackingPoint);

            sefl.notify(Message.MOVE_DETAIL_ACTION_UPDATED, moveAction);
            // update start/end frame/time of move detail
            sefl.updateMoveDetail();

            const source = $("#aTrackingPointTemplate").html();
            const template = Handlebars.compile(source);
            const html = template(trackingPoint);
            $("#trackingPoints-" + moveActionID).append(html);
            sefl.handleInputEvent(sefl, "#trackingPointID-" + trackingPoint.ID);
        });
    }

    private handleInputEvent(sefl: this, containerSelector: string) {
        $(containerSelector).on("input", "input", function (event) {
            const input = $(this);
            const currentMove = sefl.applicationState.currentMove;
            const trackingPoint = currentMove.MoveActions.flatMap(p => p.TrackingPoints).find(b => b.ID === input.data("id"));

            // update Move Detail
            if (!trackingPoint) {
                const inputName = $(this).attr("name");

            } else {
                // update the trackingPoint object and other dependencies
                deepSet(trackingPoint, input.data("path"), parseNumber(event.target.value));

                // notify other component to do something when we update a tracking point
                sefl.notify(Message.MOVE_DETAIL_TRACKINGPOINT_UPDATED, trackingPoint);
                // update start/end frame/time of move detail
                sefl.updateMoveDetail();
            }
        });
    }

    private updateMoveDetail() {
        const currentMove = this.applicationState.currentMove;
        this.applicationState.currentMove.update();

        // update the Move object of this tracking point in the Move List UI
        $("#" + currentMove.ID + "-StartFrame-EndFrame").text(`From: ${currentMove.StartFrame} - To: ${currentMove.EndFrame}`);
        $("#moveStartFrame").val(currentMove.StartFrame);
        $("#moveEndFrame").val(currentMove.EndFrame);
    }

    render() {

        this.renderMoveList();

        // // render first move in the move list
        // const move = this.applicationState.levelData.Moves[0];
        // this.renderMoveDetail(move);
    }

    updateTrackingPointUI(trackingPoint: TrackingPoint) {
        $("#" + trackingPoint.ID + "-Pos-X").val(trackingPoint.Pos.X);
        $("#" + trackingPoint.ID + "-Pos-Y").val(trackingPoint.Pos.Y);
    }
}
