import { Stage } from 'konva/lib/Stage';
import { LevelData, Move, MoveAction, Position, ScoreRadius, TrackingPoint } from './Beat';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Firestore, doc, updateDoc, setDoc, FirestoreDataConverter } from 'firebase/firestore/lite';
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const collectionName = "level_gear_demo";

const firebaseConfig = {
    apiKey: "AIzaSyCf5GU2w4JDKbIMCutiaSPX7yHNVmTRwLI",
    authDomain: "danceduel.firebaseapp.com",
    projectId: "danceduel",
    storageBucket: "danceduel.appspot.com",
    messagingSenderId: "917526572913",
    appId: "1:917526572913:web:ceeac197ead7350545d0d0",
    measurementId: "G-79RN2SHBJL"
};

class Level {
    levelData: LevelData

    constructor(levelData: LevelData) {
        this.levelData = levelData;
    }
}

// Firestore data converter
const levelConverter = {
    toFirestore: (level: Level) => {
        const videoInfo = {
            FrameRate: level.levelData.VideoInfo.FrameRate,
            Height: level.levelData.VideoInfo.Height,
            Width: level.levelData.VideoInfo.Width,
            VideoUrl: level.levelData.VideoInfo.VideoUrl,
        }

        const moves = level.levelData.Moves.map(m => {
            const moveActions = m.MoveActions.map(ma => {
                const trackingPoints = ma.TrackingPoints.map(tp => {
                    return {
                        ID: tp.ID,
                        Pos: {
                            X: tp.Pos.X,
                            Y: tp.Pos.Y
                        },
                        Time: tp.Time,
                        Frame: tp.Frame,
                        HoldTime: tp.HoldTime
                    };
                });
                const scoreRadiues = ma.ScoresRadius.map(s => {
                    return {
                        Radius: s.Radius,
                        Scoring: s.Scoring
                    };
                });

                return {
                    ID: ma.ID,
                    Name: ma.Name,
                    Joint: ma.Joint,
                    IsMajor: ma.IsMajor,
                    TrackingPoints: trackingPoints,
                    ScoresRadius: scoreRadiues
                };
            })


            return {
                ID: m.ID,
                Name: m.Name,
                StartTime: m.StartTime,
                EndTime: m.EndTime,
                StartFrame: m.StartFrame,
                EndFrame: m.StartFrame,
                MoveActions: moveActions
            };
        });

        const firestoreObj = {
            levelData: {
                //ID: level.levelData.ID,
                VideoInfo: videoInfo,
                Moves: moves
            }
        };

        return firestoreObj;
    },
    fromFirestore: (snapshot, options) => {
        debugger;
        const data = snapshot.data(options);
        return new Level(data.levelData);
    },
    fromFirestoreData(id, data) {
        const levelData = new LevelData();

        levelData.ID = id;
        levelData.Title = data.info?.songTitle

        if (data.levelData && data.levelData.VideoInfo) {
            const videoInfo = {
                FrameRate: data.levelData.VideoInfo.FrameRate,
                Height: data.levelData.VideoInfo.Height,
                Width: data.levelData.VideoInfo.Width,
                VideoUrl: data.levelData.VideoInfo.VideoUrl,
            }
            levelData.VideoInfo = videoInfo;
        }

        if (data.levelData && data.levelData.Moves) {
            const moves = data.levelData.Moves.map(m => {
                const moveActions = m.MoveActions.map(ma => {
                    const trackingPoints = ma.TrackingPoints.map(tp => {
                        const trackingPoint = new TrackingPoint();

                        trackingPoint.ID = tp.ID;
                        trackingPoint.Pos = new Position();
                        trackingPoint.Pos.X = tp.Pos.X;
                        trackingPoint.Pos.Y = tp.Pos.Y;
                        trackingPoint.Time = tp.Time;
                        trackingPoint.Frame = tp.Frame;
                        trackingPoint.HoldTime = tp.HoldTime;

                        return trackingPoint;
                    });
                    const scoreRadiues = ma.ScoresRadius.map(s => {
                        const scoreRadius = new ScoreRadius();
                        scoreRadius.Radius = s.Radius;
                        scoreRadius.Scoring = s.Scoring;
                        return scoreRadius;
                    });

                    const moveAction = new MoveAction();

                    moveAction.ID = ma.ID;
                    moveAction.Name = ma.Name;
                    moveAction.Joint = ma.Joint;
                    moveAction.IsMajor = ma.IsMajor;
                    moveAction.TrackingPoints = trackingPoints,
                        moveAction.ScoresRadius = scoreRadiues;

                    return moveAction;
                })

                const move = new Move();

                move.ID = m.ID
                move.Name = m.Name;
                move.StartTime = m.StartTime;
                move.EndTime = m.EndTime;
                move.StartFrame = m.StartFrame;
                move.EndFrame = m.StartFrame;
                move.MoveActions = moveActions;

                return move;
            });

            levelData.Moves = moves;
        }

        return levelData;
    }
};



export class Database {
    private app: FirebaseApp;
    private fireStore: Firestore;

    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.fireStore = getFirestore(this.app);
    }

    async getAllLevelDatas() {
        try {
            const levelCol = collection(this.fireStore, collectionName);
            const levelSnapshot = await getDocs(levelCol);

            return levelSnapshot.docs.map(docData => {
                const data = docData.data();
                return {
                    id: docData.id,
                    danceVideo: data.danceVideo,
                    data: levelConverter.fromFirestoreData( docData.id, data)
                };
            });
        }
        catch (e) {
            console.error("ERROR: cannot get level data", e);
        }
    }

    async getJson(jsonUrl: string) {
        const storage = getStorage();
        const fileRef = ref(storage, jsonUrl);
        try {
            const url = await getDownloadURL(fileRef);
            const response = await fetch(url);
            return await response.json();
        }
        catch (e) {
            console.error("ERROR: cannot dowload json file", e);
        }
    }

    async saveLevelData(documentId: string, levelData: LevelData) {
        // @ts-ignore
        const docRef = doc(this.fireStore, collectionName, documentId).withConverter(levelConverter);
        await setDoc(docRef, {
            levelData: levelData,
        }, { merge: true });
    }
}