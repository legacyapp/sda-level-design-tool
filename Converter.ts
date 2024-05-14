import { TrackingPoint, JointType, MovementType, Position, MoveAction, LevelData, VideoInfo, Move } from "./Beat";
import { v4 as uuidv4 } from 'uuid';

function convertBeat(oldBeat: any) {
    const newBeat = new TrackingPoint();

    newBeat.ID = oldBeat.id;
    if (oldBeat.Frame) {
        newBeat.Frame = oldBeat.Frame;
    }
    if (oldBeat.Time) {
        newBeat.Time = newBeat.Frame / 30;
    }
    newBeat.Pos = new Position();
    newBeat.Pos.X = oldBeat.Position[0];
    newBeat.Pos.Y = oldBeat.Position[1];

    return newBeat;
}

function convertJoint(joint: any): JointType {
    if (joint === "HandLeft") return JointType.LeftWrist;
    if (joint === "HandRight") return JointType.RightWrist;
    if (joint === "Hands") return JointType.LeftWrist;

    return JointType.Nose;
}

export function ConvertToVideoBeatData(poseData: any, legacyBeatData: any) {
    const levelData: LevelData = new LevelData();
    const videoInfo: VideoInfo = new VideoInfo();

    videoInfo.FrameRate = poseData.frame_rate;
    videoInfo.Height = poseData.size[0];
    videoInfo.Width = poseData.size[1];
    videoInfo.VideoUrl = legacyBeatData.danceVideo.videoUrl;
    levelData.VideoInfo = videoInfo;

    const oldBeats = legacyBeatData.beatMapper.Beats;

    // convert connections that have more than 2 beats
    for (const [oldConnectionId, oldConnection] of Object.entries(legacyBeatData.beatMapper.Connections)) {
        if (!oldBeats[oldConnection["beatA"]] || !oldBeats[oldConnection["beatB"]]) {
            continue; // Need to investigate why beatA or beatB is null
        }

        const beatA = oldBeats[oldConnection["beatA"]];

        const move: Move = new Move();
        move.ID = beatA.id;
        move.Name = JointType[convertJoint(beatA["Joint"])];

        const moveAction: MoveAction = new MoveAction();
        moveAction.ID = oldConnection["id"];
        moveAction.Joint = convertJoint(beatA["Joint"]);
        moveAction.TrackingPoints.push(convertBeat(beatA));
        moveAction.IsMajor = true;
        moveAction.ScoresRadius = [
            { Scoring: 100, Radius: 100 }
        ];



        // check if beatA don't have AnchorOut. Don't really understand why they chooses 0.3 as null or undefined value
        if (!(beatA.AnchorOut[0] === 0.3 && beatA.AnchorOut[1] === 0.3)) {
            const anchor1 = new TrackingPoint();

            anchor1.ID = uuidv4(); // random ID just for testing
            anchor1.Pos = new Position();
            anchor1.Pos.X = beatA.AnchorOut[0];
            anchor1.Pos.Y = beatA.AnchorOut[1];
            anchor1.Time = moveAction.TrackingPoints[0].Time;
            anchor1.Frame = moveAction.TrackingPoints[0].Frame;
            anchor1.HoldTime = moveAction.TrackingPoints[0].HoldTime;
            moveAction.TrackingPoints.push(anchor1);
        }

        const beatB = oldBeats[oldConnection["beatB"]];
        // check if beatB don't have AnchorIn. Don't really understand why they chooses 0.3 as null or undefined value
        if (!(beatB.AnchorIn[0] === 0.3 && beatB.AnchorIn[1] === 0.3)) {
            const anchor2 = new TrackingPoint();
            anchor2.ID = uuidv4(); // random ID just for testing
            anchor2.Pos = new Position();
            anchor2.Pos.X = beatB.AnchorIn[0];
            anchor2.Pos.Y = beatB.AnchorIn[1];
            anchor2.Time = moveAction.TrackingPoints[0].Time;
            anchor2.Frame = moveAction.TrackingPoints[0].Frame;
            anchor2.HoldTime = moveAction.TrackingPoints[0].HoldTime;
            moveAction.TrackingPoints.push(anchor2);
        }

        levelData.Moves.push(move);
        move.MoveActions.push(moveAction);
        moveAction.TrackingPoints.push(convertBeat(beatB));

        move.StartTime = move.MoveActions[0].TrackingPoints[0].Time;
        move.EndTime = move.MoveActions[0].TrackingPoints[move.MoveActions[0].TrackingPoints.length - 1].Time;
        move.StartFrame = move.MoveActions[0].TrackingPoints[0].Frame;
        move.EndFrame = move.MoveActions[0].TrackingPoints[move.MoveActions[0].TrackingPoints.length - 1].Frame;
    }

    // convert connections that has only one beat
    for (const [key, value] of Object.entries(legacyBeatData.beatMapper.Beats)) {
        let isFound = false;

        for (const [oldConnectionId, oldConnection] of Object.entries(legacyBeatData.beatMapper.Connections)) {
            if ((oldConnection["beatA"] === key) || (oldConnection["beatB"] === key)) {
                isFound = true;
            }
        }

        // if a beat is not in beatA or beatB of a connection, creat a Single Point Beat
        if (!isFound) {
            const singleBeat = convertBeat(value);
            const move: Move = new Move();
            move.ID = value["id"];
            move.Name = JointType[convertJoint(value["Joint"])];

            const trackingPoint: MoveAction = new MoveAction();
            trackingPoint.ID = key;
            trackingPoint.TrackingPoints.push(singleBeat);
            trackingPoint.Joint = convertJoint(value["Joint"]);
            trackingPoint.IsMajor = true;
            trackingPoint.ScoresRadius = [
                { Scoring: 100, Radius: 100 }
            ];

            levelData.Moves.push(move);
            move.MoveActions.push(trackingPoint);

            move.StartTime = move.MoveActions[0].TrackingPoints[0].Time;
            move.EndTime = move.MoveActions[0].TrackingPoints[move.MoveActions[0].TrackingPoints.length - 1].Time;
            move.StartFrame = move.MoveActions[0].TrackingPoints[0].Frame;
            move.EndFrame = move.MoveActions[0].TrackingPoints[move.MoveActions[0].TrackingPoints.length - 1].Frame;
        }
    }

    levelData.sort();

    return levelData;
}

export function NormalizedLandmarks(poseData: any) {
    poseData.normalizedFrames = poseData.frames.map(poseObj => {
        const normalizedFrame = {
            landmarks: [],
            timestamp: poseObj.timestamp
        };

        normalizedFrame.landmarks = poseObj.pose.map(landmark => {
            return {
                x: landmark[0],
                y: landmark[1],
                z: landmark[2],
                visibility: landmark[3]
            };
        });

        return normalizedFrame;
    });
}