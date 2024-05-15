import "./style.css";
import $ from "jquery";
import { App, ApplicationState } from "./App";
import { LevelData, VideoInfo } from "./Beat";
import { NormalizedLandmarks } from "./Converter";
import Handlebars from "handlebars";

const app = new App();
app.Init();

$(function () {
  app.loadAllLevelDatas()
    .then(allLevelDatas => {
      console.log(allLevelDatas);

      const videoSelectionData = {
        Videos: []
      };

      videoSelectionData.Videos = allLevelDatas.map((l, i) => {
        return {
          Index: i,
          DocumentId: l.id,
          Title: l.data.Title
        }
      });

      // Render tracking points
      const source = $("#videoSelectionTemplate").html();
      const template = Handlebars.compile(source);

      const html = template(videoSelectionData);
      $("#videoSelectionContainer").html(html);

      $("#videoSelectionContainer").on("change", "select", function (event) {
        $("#loading-screen").removeClass("hidden");
        const video = app.AllLevelDatas.find(l => l.id === $(this).val());

        //  $("#videoSelection").prop("selectedIndex", 0);
        app.getJson(video.danceVideo.frameDataUrl)
          .then(frameData => {
            const levelData = video.data;
            const videoInfo = new VideoInfo();

            videoInfo.FrameRate = frameData.frame_rate;
            videoInfo.Height = frameData.size[0];
            videoInfo.Width = frameData.size[1];
            videoInfo.VideoUrl = video.danceVideo.videoUrl;
            levelData.VideoInfo = videoInfo;

            NormalizedLandmarks(frameData);
            const applicationState = new ApplicationState(frameData, levelData);

            app.CurrentDocumentId = video.id;
            app.run(applicationState);
          });
      });

      // trigger select the first video in the selection
      $("#videoSelection").val(allLevelDatas[0].id).trigger("change");
    });
});

