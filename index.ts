import toastr from "toastr";
import "./style.css";
import $ from "jquery";
import { App, ApplicationState } from "./App";
import { LevelData, VideoInfo } from "./Beat";
import { NormalizedLandmarks } from "./Converter";
import Handlebars from "handlebars";
import { convertToLevelData, MessageTypes, ParentChildMessage, renamePropertiesInDepth } from "./util";

const app = new App();
app.Init();

$(function () {
  if (process.env.APP_INTEGRATE_BLUEPRINT_TOOL) {
    // Listen for messages from the parent window
    window.addEventListener('message', (event: MessageEvent) => {
      const message = event.data as ParentChildMessage;

      if (message && message.type) {
        switch (message.type) {
          case MessageTypes.ParentReady: {
            // Notify the parent that the child is ready
            const messageToParent: ParentChildMessage = {
              type: MessageTypes.ChildReady
            }
            window.parent.postMessage(messageToParent, '*');
            break;
          }

          case MessageTypes.ParentSendBlueprintVersion: {
            // Access the data sent from the parent window
            const receivedData = message.data;

            const source = $("#versionSelectionTemplate").html();
            const template = Handlebars.compile(source);

            const html = template({
              Versions: receivedData
            });
            $("#versionSelectionContainer").html(html);

            $("#versionSelectionContainer").off("change");
            $("#versionSelectionContainer").on("change", "select", function (event) {
              $("#loading-screen").removeClass("hidden");
              const version = receivedData.find(v => v.name === $(this).val());
              const messageToParent: ParentChildMessage = {
                type: MessageTypes.ChildRequestSongDataConfig,
                data: {
                  version: version.name
                }
              }
              window.parent.postMessage(messageToParent, '*');

            });

            // trigger select the first video in the selection
            $("#versionSelection").val(receivedData[0].name).trigger("change");

            break;
          }
          case MessageTypes.ParentSendSongDataConfig: {
            const receivedData = message.data;
            app.SongDataConfig = receivedData.data;
            app.loadAllLevelDatas()
              .then(allLevelDatas => {

                const videoSelectionData = {
                  Videos: []
                };

                if (process.env.APP_INTEGRATE_BLUEPRINT_TOOL) {
                  if (receivedData.data && receivedData.data.length > 0) {
                    videoSelectionData.Videos = receivedData.data.map((s, i) => {
                      return {
                        Index: i,
                        DocumentId: s.objId,
                        Title: s.data.info.songTitle
                      };
                    });
                  }
                } else {
                  videoSelectionData.Videos = allLevelDatas.map((l, i) => {
                    return {
                      Index: i,
                      DocumentId: l.id,
                      Title: l.data.Title
                    }
                  });
                }

                // Render video selection
                const source = $("#videoSelectionTemplate").html();
                const template = Handlebars.compile(source);
                const html = template(videoSelectionData);
                $("#videoSelectionContainer").html(html);

                $("#videoSelectionContainer").off("change");
                $("#videoSelectionContainer").on("change", "select", function (event) {
                  $("#loading-screen").removeClass("hidden");
                  const messageToParent: ParentChildMessage = {
                    type: MessageTypes.ChildRequestLevelData,
                    data: {
                      songId: $(this).val()
                    }
                  }
                  window.parent.postMessage(messageToParent, '*');
                });

                // trigger select the first video in the selection
                if (videoSelectionData.Videos && videoSelectionData.Videos.length > 0) {
                  $("#videoSelection").val(videoSelectionData.Videos[0].DocumentId).trigger("change");
                }
                $("#loading-screen").addClass("hidden");
              });

            break;
          }
          case MessageTypes.ParentSendLevelData: {
            let receivedData = message.data;
            let video;
            let postUrl;
            let videoUrl;

            if (process.env.APP_INTEGRATE_BLUEPRINT_TOOL) {
              video = app.SongDataConfig.find(s => s.objId === receivedData.songId);
              postUrl = video.data.levelData.poseUrl;
              videoUrl = video.data.levelData.videoUrl;
            } else {
              video = app.AllLevelDatas.find(l => l.id === receivedData.songId);
              postUrl = video.danceVideo.frameDataUrl;
              videoUrl = video.danceVideo.videoUrl;
            }

            if (video) {
              app.getJson(postUrl)
                .then(frameData => {
                  let levelData;

                  if (process.env.APP_INTEGRATE_BLUEPRINT_TOOL) {
                    levelData = renamePropertiesInDepth(receivedData.levelData?.data);
                    levelData = convertToLevelData(receivedData.songId, {
                      levelData: levelData,
                      info: null
                    });
                  } else {
                    levelData = video.data;
                  }

                  const videoInfo = new VideoInfo();

                  videoInfo.FrameRate = frameData.frame_rate;
                  videoInfo.Height = frameData.size[0];
                  videoInfo.Width = frameData.size[1];
                  videoInfo.VideoUrl = videoUrl;
                  levelData.VideoInfo = videoInfo;

                  NormalizedLandmarks(frameData);
                  const applicationState = new ApplicationState(frameData, levelData);

                  app.CurrentDocumentId = video.id || video.objId;
                  app.run(applicationState);
                });
            }

            break;
          }
          case MessageTypes.ParentSaveLevelData: {
            if (message.data.ok) {
              toastr.success("Saved Level Data to Blueprint Successfully.");
            } else {
              toastr.error("ERROR: cannot save level data to blueprint. See console log for detail.");
              console.log(message);
            }

            break;
          }
          default: {
            break;
          }
        }
      }
    });
  } else {
    app.loadAllLevelDatas()
      .then(allLevelDatas => {

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
  }
});

