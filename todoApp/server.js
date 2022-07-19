const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
// 로그인관련
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session')

// method-override사용
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

const { ObjectId } = require('mongodb');

// 환경변수 설정
require('dotenv').config()

app.set('view engine', 'ejs');

// css파일 사용하려면 밑에 코드 추가 = 미들웨어
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true }))

// 로그인관련
app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

var db; //데이터 베이스를 저장하기 위한 변수

MongoClient.connect(process.env.DB_URL, function (에러, client) {
  //todoapp이라는 database에 연결함
  db = client.db('todoapp');
  app.listen(8080, function () {
    console.log('lisening on 8080');
  });
})

// 미들웨어 만들기
function 로그인했니(요청, 응답, next) {
  if (요청.user) {
    next()
  } else {
    응답.send('로그인 안했음')
  }
}

// 로그인기능
app.get('/login', function (요청, 응답) {
  응답.render('login.ejs')
});

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/fail'
}), function (요청, 응답) {
  응답.redirect('/')
});

app.get('/signup', function (요청, 응답) {
  응답.render('signup.ejs')
});

app.get('/mypage', 로그인했니, function (요청, 응답) {
  console.log(요청.user);
  응답.render('mypage.ejs', { 사용자: 요청.user })
});



passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  //console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    if (에러) return done(에러)

    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
    if (입력한비번 == 결과.pw) {
      return done(null, 결과)
    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));
// done(서버에러, 성공시사용자DB데이터, 콜백함수) : 세개의 파라미터를 가짐
passport.serializeUser(function (user, done) {
  done(null, user.id)
});
passport.deserializeUser(function (아이디, done) {
  db.collection('login').findOne({ id: 아이디 }, function (에러, 결과) {
    done(null, 결과)
  })
});
// deserializeUser() : 로그인한 유저의 세션아이디를 바탕으로 개인정보를 DB에서 찾는 역할

// 회원가입 기능
app.post('/register', function (요청, 응답) {
  db.collection('login').findOne({ id: 요청.body.id }, function (에러, 결과) {
    if (결과.id == 요청.body.id) {
      응답.send('중복아이디 입니다.')
    } else {
      db.collection('login').insertOne({ name: 요청.body.name, id: 요청.body.id, pw: 요청.body.pw }, function (에러, 결과) {
        응답.redirect('/login')
        // console.log(요청.body.id);
      })
      // console.log();
    }
  })
})


app.get('/', function (요청, 응답) {
  응답.render('index.ejs');
});
app.get('/write', function (요청, 응답) {
  응답.render('write.ejs');
});
// db에서 데이터 받아서 list.ejs에 렌더링
app.get('/list', function (요청, 응답) {
  db.collection('post').find().toArray(function (에러, 결과) {
    응답.render('list.ejs', { posts: 결과 }); //랜더링해주는 문법
  });
});

// 이미지 업로드 기능 -> npm install multer
let multer = require('multer');

var path = require('path');
const { ObjectID } = require('bson');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/image')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});
var upload = multer({
  storage: storage,
  // fileFilter: function (req, file, callback) {
  //   var ext = path.extname(file.originalname);
  //   if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
  //     return callback(new Error('PNG, JPG만 업로드하세요'))
  //   }
  //   callback(null, true)
  // },
});

app.get('/upload', function (요청, 응답) {
  응답.render('upload.ejs');
});
app.post('/upload', upload.single('frofile'), function (요청, 응답) {
  응답.send('저장완료');
});
app.get('/image/:imagename', function (요청, 응답) {
  응답.sendFile(__dirname + './public/image/' + 요청.params.imagename)
})



// 댓글달기 기능
app.post('/commentroom', 로그인했니, function (요청, 응답) {
  var infoData = {
    title: 요청.body.title,
    member: [ObjectId(요청.body.postId), 요청.user._id],
    data: new Date()
  }
  db.collection('commentroom').insertOne(infoData).then((result) => {
    console.log(result);
  }).catch((err) => {
    console.log(err);
  })
})
app.get('/comment', 로그인했니, function (요청, 응답) {
  db.collection('commentroom').find({ member: 요청.user._id }).toArray().then((결과) => {
    응답.render('comment.ejs', { data: 결과 });
  });
});


// 수정기능
app.get('/edit/:id', function (요청, 응답) {
  db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
    응답.render('edit.ejs', { data: 결과 })
    응답.render('detail.ejs', { data: 결과 })
  })
})

app.put('/edit', function (요청, 응답) {
  db.collection('post').updateOne({ _id: parseInt(요청.body.id) }, { $set: { title: 요청.body.title, text: 요청.body.text } }, function (에러, 결과) {
    응답.redirect('/list');
  })
})

app.get('/detail/:id', function (요청, 응답) {
  db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
    응답.render('detail.ejs', { data: 결과 })
  })
})




//DB저장 방법 post요청
app.post('/write', function (요청, 응답) {

  db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
    // console.log(결과.totalPost);
    var totalPost = 결과.totalPost;
    var userInfo = { _id: totalPost + 1, title: 요청.body.title, text: 요청.body.formText, user: 요청.user._id };
    db.collection('post').insertOne(userInfo, function (에러, 결과) {
      console.log(요청.user._id);
      console.log('저장완료');
      // db.collection('counter').updateOne({어떤 데이터를 수정할지},{수정값})
      db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
        if (에러) { return console.log(에러) };
      });
    });
  });
  응답.redirect('/list');
});
//auto increment : 글번호 달아서 저장하는것 db에 거의 다 있지만 mongoDB는 없음

app.delete('/delete', function (요청, 응답) {
  // ajax로 보내준 데이터임
  요청.body._id = parseInt(요청.body._id)
  var 삭제데이터 = { _id: 요청.body._id, user: 요청.user._id }
  // , user: 요청.user._id
  console.log(요청.body);
  db.collection('post').remove(삭제데이터, function (에러, 결과) {
    console.log('삭제완료');
    응답.status(200).send({ message: '성공' })
  });
});


// 검색기능 get요청으로 불러오기
app.get('/search', (요청, 응답) => {
  var 검색조건 = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: 요청.query.value,
          path: {
            'wildcard': '*'
          }
        }
      }
    }
  ]
  // console.log(요청.query.value);
  db.collection('post').aggregate(검색조건).toArray((에러, 결과) => {
    console.log(결과);
    응답.render('result.ejs', { posts: 결과 })
  })
})





