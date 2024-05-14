import "./style.css";
import { ConvertToVideoBeatData as ConvertToLevelData, NormalizedLandmarks } from "./Converter"
import $ from "jquery";
import { App, ApplicationState } from "./App";

const app = new App();

app.Init();

async function fetchVideoData(videoBeatUrl: string) {
  const videoBeatResponse = await fetch(videoBeatUrl);
  const videoBeat = await videoBeatResponse.json();
  const frameDataResponse = await fetch(videoBeat.danceVideo.frameDataUrl);

  const frameData = await frameDataResponse.json();
  NormalizedLandmarks(frameData);

  const levelData = ConvertToLevelData(frameData, videoBeat);

  return {
    FrameData: frameData,
    LevelData: levelData
  }
}

$(function () {
  // Download video metadata, pose data and beat data
  //fetchVideoData("pose_data/5IJZfPo4Oj2K7uJ5XMfI.json")
  fetchVideoData("pose_data/ENZYm52foFbYJ0KGUIQr.json")
  //fetchVideoData("pose_data/NkztxSSFV4J7metC9mO5.json")
  //fetchVideoData("pose_data/UjSKIHRY7XuAciOi0pkj.json")
    .then(({ FrameData, LevelData }) => {
      const applicationState = new ApplicationState(FrameData, LevelData);

      app.run(applicationState);
    });
});

