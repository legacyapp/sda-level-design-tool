import { ApplicationState } from "./App";
import $ from "jquery";

export class MainTabsUIController {
    private applicationState: ApplicationState;

    constructor(applicationState: ApplicationState) {
        this.applicationState = applicationState;
        this.render();
    }

    public render() {
        $("#main-tab-headers li a").on("click", function () {
            if (!$(this).hasClass("active")) {
                $("#main-tab-headers li a").removeClass("text-blue-600 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500 group");
                $(this).removeClass("border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group");
                $(this).addClass("text-blue-600 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500 group");

                const contentTabId = $(this).data("tabs-target");
                $(".tabContent").addClass("hidden");
                $(contentTabId).removeClass("hidden");

                $("#main-tab-headers li a svg").removeClass("text-blue-600 dark:text-blue-500");
                $(this).children("svg").removeClass("text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300");
                $(this).children("svg").addClass("text-blue-600 dark:text-blue-500");
            }
        });
    }
}