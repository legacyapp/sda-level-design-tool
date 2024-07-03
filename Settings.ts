import { ApplicationState, Message, NotifyDelegate } from "./App";
import Handlebars from "handlebars";
import $ from "jquery";
import { deepGet, deepSet, parseNumber, scrollIntoViewIfNeeded } from "./util";
import toastr from "toastr";
import { FrameAdjust } from "./Beat";

export class SettingsUIController {
    private applicationState: ApplicationState;
    private notify: NotifyDelegate;

    constructor(applicationState: ApplicationState, notify: NotifyDelegate) {
        this.applicationState = applicationState;
        this.notify = notify;
    }

    public render() {
        this.renderAdjustSettings("#framesAdjustScale", "FramesAdjustScale");
        this.renderAdjustSettings("#framesStopAdjustPosition", "FramesStopAdjustPosition");
    }

    private renderAdjustSettings(containerSelector: string, settingName: string) {
        this.offHandleEventFunctions(containerSelector, settingName);
        $("#add" + settingName).off("click");

        Handlebars.registerPartial("startEndFramesTemplate", $("#startEndFramesTemplate").html());
        const source = $(containerSelector + "Template").html();
        const template = Handlebars.compile(source);
        const html = template(this.applicationState.levelData.TrackingAdjustSetting);
        $(containerSelector).empty();
        $(containerSelector).html(html);

        this.handleFrameAdjustEvents(containerSelector, settingName);
        this.handleAddFrameAdjust(this, containerSelector, "#add" + settingName, containerSelector + "List", settingName);
    }

    private offHandleEventFunctions(containerSelector: string, settingName: string) {
        $(containerSelector).off("input", "input");
        $(containerSelector + " #decrement-button").off("click");
        $(containerSelector + " #increment-button").off("click");
        $(containerSelector).off("click", ".deleteFrameAdjust");
    }

    private handleFrameAdjustEvents(containerSelector: string, settingName: string) {
        this.handleIncrementDecrementClickEvent(this, containerSelector + " #decrement-button", "value-change-step", -1, settingName);
        this.handleIncrementDecrementClickEvent(this, containerSelector + " #increment-button", "value-change-step", 1, settingName);
        this.handleInputEvent(this, containerSelector, settingName);
        this.handleDeleteFrameAdjust(this, containerSelector, settingName)
    }

    private handleIncrementDecrementClickEvent(self: this, containerSelector: string, stepAttrName: string, factor: number, settingName: string) {
        $(containerSelector).on("click", function (event) {
            const input = factor > 0 ? $(this).prev() : $(this).next();
            const step = parseNumber($(input).data(stepAttrName));

            if (input && step) {
                const frameAdjust = self.applicationState.levelData.TrackingAdjustSetting[settingName].find(f => f.Index === input.data("id"));

                if (frameAdjust) {
                    let newValue = deepGet(frameAdjust, input.data("path")) + (factor * step);
                    newValue = newValue || 0;
                    deepSet(frameAdjust, input.data("path"), newValue);
                    input.val(newValue);

                    self.notify(Message.SETTING_FRAME_ADJUST_UPDATED, newValue);
                }
            }
        });
    }

    private handleInputEvent(self: this, containerSelector: string, settingName: string) {
        $(containerSelector).on("input", "input", function (event) {
            const input = $(this);

            const frameAdjust = self.applicationState.levelData.TrackingAdjustSetting[settingName].find((f, index) => index === input.data("id"));
            if (frameAdjust) {
                deepSet(frameAdjust, input.data("path"), parseNumber(event.target.value));
            }
        });
    }

    private handleAddFrameAdjust(self: this, containerSelector: string, buttonSelector: string, frameListContainer: string, settingName: string) {
        $(buttonSelector).on("click", function () {
            const length = self.applicationState.levelData.TrackingAdjustSetting[settingName].length;
            const lastElement = self.applicationState.levelData.TrackingAdjustSetting[settingName][length - 1];
            const frameAdjust = new FrameAdjust(0, 0, lastElement ? lastElement.Index + 1 : 0, settingName);
            self.applicationState.levelData.TrackingAdjustSetting[settingName].push(frameAdjust);

            const source = $("#startEndFramesTemplate").html();
            const template = Handlebars.compile(source);
            const html = template(frameAdjust);
            $(frameListContainer).append(html);

            self.offHandleEventFunctions(containerSelector, settingName);
            self.handleFrameAdjustEvents(containerSelector, settingName);
        });
    }

    private handleDeleteFrameAdjust(self: this, containerSelector: string, settingName: string) {
        $(containerSelector).on("click", ".deleteFrameAdjust", function (event) {
            const index = $(this).data("id");
            const settings = self.applicationState.levelData.TrackingAdjustSetting[settingName].filter(f => f.Index !== index);
            self.applicationState.levelData.TrackingAdjustSetting[settingName] = settings;

            self.renderAdjustSettings(containerSelector, settingName);
        });
    }
}