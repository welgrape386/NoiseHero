import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(
  "mongodb://tester1:xjnV3gv68zzMWE@ac-bt7yvuu-shard-00-00.envsxg6.mongodb.net:27017,ac-bt7yvuu-shard-00-01.envsxg6.mongodb.net:27017,ac-bt7yvuu-shard-00-02.envsxg6.mongodb.net:27017/noise_app?ssl=true&replicaSet=atlas-wmqc0h-shard-0&authSource=admin&appName=Cluster0"
)
.then(() => console.log("MongoDB 연결 성공"))
.catch((err) => console.log(err));


// 유저 스키마
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  nickname: String,
  apartment_name: String,
  dong: String,
  ho: String,
  floor: Number,
});

const User = mongoose.model("User", userSchema);


// 회원가입
app.post("/auth/signup", async (req, res) => {
  try {
    const {
      email,
      password,
      nickname,
      apartment_name,
      dong,
      ho,
      floor,
    } = req.body;

    const exists = await User.findOne({ email });

    if (exists) {
      return res.status(400).json({
        detail: "이미 사용 중인 이메일입니다.",
      });
    }

    const user = await User.create({
      email,
      password,
      nickname,
      apartment_name,
      dong,
      ho,
      floor,
    });

    res.json({
      message: "회원가입 성공",
      email: user.email,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      detail: "회원가입 실패",
    });
  }
});


// 로그인
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
      password,
    });

    if (!user) {
      return res.status(401).json({
        detail: "이메일 또는 비밀번호 오류",
      });
    }

    res.json({
      message: "로그인 성공",
      access_token: user.email,
      token_type: "bearer",
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      detail: "로그인 실패",
    });
  }
});


// 내 정보 조회
app.get("/auth/me", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        detail: "토큰 없음",
      });
    }

    const email = token.replace("Bearer ", "");

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        detail: "사용자 없음",
      });
    }

    res.json({
      message: "사용자 정보 조회 성공",
      email: user.email,
      nickname: user.nickname,
      apartment_name: user.apartment_name,
      dong: user.dong,
      ho: user.ho,
      floor: user.floor,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      detail: "조회 실패",
    });
  }
});

// 회원정보 수정
app.patch("/auth/me", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        detail: "토큰 없음",
      });
    }

    const email = token.replace("Bearer ", "");

    const updatedUser = await User.findOneAndUpdate(
      { email },
      req.body,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        detail: "사용자 없음",
      });
    }

    res.json({
      message: "수정 완료",
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      apartment_name: updatedUser.apartment_name,
      dong: updatedUser.dong,
      ho: updatedUser.ho,
      floor: updatedUser.floor,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      detail: "수정 실패",
    });
  }
});


// 서버 실행
app.listen(8000, () => {
  console.log("서버 실행 중: http://127.0.0.1:8000");
});