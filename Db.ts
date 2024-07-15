import { LevelData, Move, MoveAction, Position, ScoreRadius, TrackingPoint, TrackingAdjustSetting, FrameAdjust } from './Beat';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Firestore, doc, updateDoc, setDoc, FirestoreDataConverter } from 'firebase/firestore/lite';
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { convertToLevelData } from './util';

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
                    const scoreRadiues = tp.ScoresRadius.map(s => {
                        return {
                            Radius: s.Radius,
                            Scoring: s.Scoring
                        };
                    });

                    return {
                        ID: tp.ID,
                        Pos: {
                            X: tp.Pos.X,
                            Y: tp.Pos.Y
                        },
                        Time: tp.Time,
                        Frame: tp.Frame,
                        HoldTime: tp.HoldTime,
                        ScoresRadius: scoreRadiues,
                        Index: tp.Index || 0
                    };
                });
                const scoreRadiues = ma.ScoresRadius.map(s => {
                    return {
                        Radius: s.Radius,
                        Scoring: s.Scoring
                    };
                });

                const threshold = ma.Threshold >= 0 ? ma.Threshold : 100;

                return {
                    ID: ma.ID,
                    Name: ma.Name,
                    Joint: ma.Joint,
                    IsMajor: ma.IsMajor,
                    TrackingPoints: trackingPoints,
                    ScoresRadius: scoreRadiues,
                    Threshold: threshold
                };
            })


            return {
                ID: m.ID,
                Name: m.Name,
                StartTime: m.StartTime,
                EndTime: m.EndTime,
                StartFrame: m.StartFrame,
                EndFrame: m.EndFrame,
                MoveActions: moveActions
            };
        });

        const firestoreObj: any = {
            levelData: {
                //ID: level.levelData.ID,
                VideoInfo: videoInfo,
                Moves: moves
            }
        };


        if (level.levelData.TrackingAdjustSetting) {
            if (!firestoreObj.TrackingAdjustSetting) {
                firestoreObj.TrackingAdjustSetting = {};
            }

            if (level.levelData.TrackingAdjustSetting.BestFitFrameAdjust >= 0) {
                firestoreObj.TrackingAdjustSetting.BestFitFrameAdjust = level.levelData.TrackingAdjustSetting.BestFitFrameAdjust;
            } else {
                firestoreObj.TrackingAdjustSetting.BestFitFrameAdjust = -1;
            }

            if (level.levelData.TrackingAdjustSetting.FramesAdjustScale && level.levelData.TrackingAdjustSetting.FramesAdjustScale.length > 0) {
                firestoreObj.TrackingAdjustSetting.FramesAdjustScale = level.levelData.TrackingAdjustSetting.FramesAdjustScale.map(f => {
                    return {
                        StartFrame: f.StartFrame,
                        EndFrame: f.EndFrame
                    };
                });
            } else {
                firestoreObj.TrackingAdjustSetting.FramesAdjustScale = [];
            }

            if (level.levelData.TrackingAdjustSetting.FramesStopAdjustPosition && level.levelData.TrackingAdjustSetting.FramesStopAdjustPosition.length > 0) {
                firestoreObj.TrackingAdjustSetting.FramesStopAdjustPosition = level.levelData.TrackingAdjustSetting.FramesStopAdjustPosition.map(f => {
                    return {
                        StartFrame: f.StartFrame,
                        EndFrame: f.EndFrame
                    };
                });
            } else {
                firestoreObj.TrackingAdjustSetting.FramesStopAdjustPosition = [];
            }
        }

        return firestoreObj;
    },
    fromFirestore: (snapshot, options) => {
        debugger;
        const data = snapshot.data(options);
        return new Level(data.levelData);
    },
    fromFirestoreData(id, data) {
        return convertToLevelData(id, data);
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
                    data: levelConverter.fromFirestoreData(docData.id, data)
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