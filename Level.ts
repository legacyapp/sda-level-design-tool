import { Move, MovementType, TrackingPoint } from "./Beat";
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
                $("#allMoves li").removeClass('bg-gray-300');
                $(this).addClass("bg-gray-300");

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


        Handlebars.registerPartial("trackingPointsTemplate", $("#trackingPointsTemplate").html());

        // Render tracking points
        const source = $("#actionsTemplate").html();
        const template = Handlebars.compile(source);

        const html = template(move);
        $("#actions").html(html);

        const sefl = this;
        $("#actions").on("input", "input", function (event) {
            const input = $(this);
            const currentMove = sefl.applicationState.currentMove;
            const trackingPoint = currentMove.MoveActions.flatMap(p => p.TrackingPoints).find(b => b.ID === input.data("id"));

            // update Move Detail
            if (!trackingPoint) {
                const inputName = $(this).attr("name");
                
            } else {
                // update the trackingPoint object and other dependencies
                deepSet(trackingPoint, input.data("path"), parseNumber(event.target.value));
                currentMove.update();

                // update the Move object of this tracking point in the Move List UI
                $("#" + currentMove.ID + "-StartFrame-EndFrame").text(`From: ${currentMove.StartFrame} - To: ${currentMove.EndFrame}`);
                $("#moveStartFrame").val(currentMove.StartFrame);
                $("#moveEndFrame").val(currentMove.EndFrame);

                // notify other component to do something when we update a tracking point
                sefl.notify(Message.MOVE_DETAIL_TRACKINGPOINT_UPDATED, trackingPoint);
            }
        });
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
