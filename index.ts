import toastr from "toastr";
import "./style.css";
import $ from "jquery";
import { App, ApplicationState } from "./App";
import { LevelData, VideoInfo } from "./Beat";
import { NormalizedLandmarks } from "./Converter";
import Handlebars from "handlebars";
import { MessageTypes, ParentChildMessage } from "./util";

const INTEGRATE_BLUEPRINT_TOOL = true;

const app = new App();
app.Init();

$(function () {
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

					app.loadAllLevelDatas()
						.then(allLevelDatas => {

							const videoSelectionData = {
								Videos: []
							};

							if (INTEGRATE_BLUEPRINT_TOOL) {
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
								const video = app.AllLevelDatas.find(l => l.id === $(this).val());


								if (video) {
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
								}
							});

							// trigger select the first video in the selection
							$("#videoSelection").val(videoSelectionData.Videos[0].DocumentId).trigger("change");
							$("#loading-screen").addClass("hidden");
						});

					break;
				}
				case MessageTypes.ParentSaveLevelData: {
					const receivedData = message.data;
					if (message.data.ok) {
						toastr.success("Level Data Saved Successfully.");
					} else {
						toastr.error(receivedData);
					}

					break;
				}
				default: {
					break;
				}
			}
		}
	});

	if (!INTEGRATE_BLUEPRINT_TOOL) {
		const messageToParent: ParentChildMessage = {
			type: MessageTypes.ParentSendSongDataConfig,
			data: undefined
		}
		window.postMessage(messageToParent, '*');
	}
});

