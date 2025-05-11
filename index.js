import express from "express";
import axios from "axios";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";

import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import key,{password,secret} from "./config.js";


const app = express();
const port = 3000;
const saltRounds=10;


app.use(bodyParser.urlencoded({ extended: true }));
const API_URL = "https://api.polygon.io";
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

const myBearerToken = key;
const config = {
  headers: { Authorization: `Bearer ${myBearerToken}` },
};



app.use(
  session({
    secret:secret,
    resave: false,
    saveUninitialized: true ,
    cookie:{
      maxAge:1000*60*60*24
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Investmeter",
  password: password,
  port: 5432,
});
db.connect(); 


var  posts=[];
var start=true;

async function getPosts(){
  for(var i=0; i<posts.length;i++){
    posts.splice(i);
  }

  var data =  await db.query(`SELECT * FROM posts order by id desc `);
  data.rows.forEach((post) => {
    posts.push({author : post.author,
                time:post.time,
                content:post.content,
                title:post.title,
                id:post.id
    }
  
    );
  });
  return posts;
}


app.get("/", async (req, res) => {

  var prices="";
  var date= new Date();
  db.query(
    `Update stock Set 
    name = 'AAPL'
     where id= 1 `
  );

  var start= new Date();
  start.setDate(date.getDate()-90);

  var day1= start.getDate();
  var month1= start.getMonth();
  month1++;
  var year1= start.getFullYear();

  var day= date.getDate();
  var month= date.getMonth();
  month++;
  var year= date.getFullYear();
 

  if(day<10){
    day="0"+day;
  }
  if(day1<10){
    day1="0"+day1;
  }
  if(month<10){
    month="0"+month;
  }
  if(month1<10){
    month1="0"+month1;
  }

  try{
        const response = await axios.get(API_URL +`/v2/aggs/ticker/AAPL/range/1/day/${year1}-${month1}-${day1}/${year}-${month}-${day}?adjusted=true&sort=asc`,config);
        const info=response.data["results"];
        const length= info.length;
        const count=response.data["resultsCount"];
        const open=response.data["results"][length-1]["o"];
        const volume=response.data["results"][length-1]["v"];
        const volumeWeighted=response.data["results"][length-1]["vw"];
        const low=response.data["results"][length-1]["l"];
        const high=response.data["results"][length-1]["h"];
        const close=response.data["results"][length-1]["c"];

        const biWeekly= await advice("AAPL",10); 
        const fifty= await advice("AAPL",50); 
        const yearly= await advice("AAPL",365);
        
        console.log("change 10 days is "+biWeekly+" "+"change 50 days is "+fifty+" "+"change 365 days is "+yearly+" ");


for(var i=0; i<info.length;i++) {

  if(i!==info.length-1){
prices=prices+ info[i]["c"]+",";
  }
  
else{
  prices=prices+ info[i]["c"];
}
          
        }
        res.render("analysis.ejs", {
          count:count,
          open:open,
          close:close,
          volume:volume,
          vw:volumeWeighted,
          high:high,
          low:low,
          BiWeekly:biWeekly,
          Fifty: fifty,
          Yearly:yearly,
          loggedin:req.isAuthenticated(),
          prices:prices,
          number:90
         });
        
    
  } 
      catch (error) {
        console.log(error.message);
    }
       

  });

  app.get(`/period/:length`, async (req, res) => {
    var period= req.params.length;
    var stockEdit =  await db.query(`SELECT * FROM stock where id=1; `);
    var stockEdit2=stockEdit.rows[0];
    var stockInUse=stockEdit2.name;
    console.log("the current stock is "+stockInUse);

    var prices="";
    var periodSentence="";
    var date= new Date();
    console.log("its autheticated "+req.isAuthenticated());
    var start= new Date();

    if(period===":10"){
    start.setDate(date.getDate()-10);
    periodSentence="10 days";
    var number=10;
    }

    else if(period===":50"){
      start.setDate(date.getDate()-50);
      periodSentence="50 days";
      var number=50;
      }

      else if(period===":90"){
        start.setDate(date.getDate()-90);
        periodSentence="3 months";
        var number=90;
        }

   else if(period===":365"){
    start.setDate(date.getDate()-365);
    periodSentence="year";
    var number=365;
   }  

  
    var day1= start.getDate();
    var month1= start.getMonth();
    month1++;
    var year1= start.getFullYear();
  
    var day= date.getDate();
    var month= date.getMonth();
    month++;
    var year= date.getFullYear();
  
    if(day<10){
      day="0"+day;
    }
    if(day1<10){
      day1="0"+day1;
    }
    if(month<10){
      month="0"+month;
    }
    if(month1<10){
      month1="0"+month1;
    }
  
    try{
          const response = await axios.get(API_URL +`/v2/aggs/ticker/${stockInUse}/range/1/day/${year1}-${month1}-${day1}/${year}-${month}-${day}?adjusted=true&sort=asc`,config);
          const info=response.data["results"];
          const length= info.length;
          const count=response.data["resultsCount"];
          const open=response.data["results"][length-1]["o"];
          const volume=response.data["results"][length-1]["v"];
          const volumeWeighted=response.data["results"][length-1]["vw"];
          const low=response.data["results"][length-1]["l"];
          const high=response.data["results"][length-1]["h"];
          const close=response.data["results"][length-1]["c"];

          const fifty= await advice(stockInUse,50); 
          const yearly=await advice(stockInUse,365);
          const biWeekly=await advice(stockInUse,10); 
  
  for(var i=0; i<info.length;i++) {

    if(i!==info.length-1){
  prices=prices+ info[i]["c"]+",";
    }

  else{
    prices=prices+ info[i]["c"];
  }
            
          }
          res.render("analysis.ejs", {
            count:count,
            open:open,
            close:close,
            volume:volume,
            vw:volumeWeighted,
            high:high,
            low:low,
            BiWeekly:biWeekly,
            Fifty: fifty,
            Yearly:yearly,
            loggedin:req.isAuthenticated(),
            prices:prices,
            period:periodSentence,
            number:number,
            stock:stockInUse
           });
          
      
    } 
        catch (error) {
          console.log(error.message);
      }
         
  
    });




  app.post("/choose", async (req, res) => {
  var prices="";
  var date= new Date();
  var start= new Date();

  start.setDate(date.getDate()-90);

  var day1= start.getDate();
  var month1= start.getMonth();

  month1++;

  var year1= start.getFullYear();

  var day= date.getDate();
  var month= date.getMonth();

  month++;

  var year= date.getFullYear();

  if(day<10){
    day="0"+day;
  }
  if(day1<10){
    day1="0"+day1;
  }
  if(month<10){
    month="0"+month;
  }
  if(month1<10){
    month1="0"+month1;
  }

  var stockname= req.body.stock;
  stockname=stockname.toUpperCase();
console.log("The name of the stock is "+stockname);
  db.query(
    `Update stock Set 
    name = '${stockname}'
     where id= 1 `
  );


  try{
    

        const response = await axios.get(API_URL +`/v2/aggs/ticker/${stockname}/range/1/day/${year1}-${month1}-${day1}/${year}-${month}-${day}?adjusted=true&sort=asc`,config);

        const info=response.data["results"];
        console.log("I am here inside the try");
        const length=response.data["resultsCount"];
        const open=response.data["results"][length-1]["o"];
        const volume=response.data["results"][length-1]["v"];
        const volumeWeighted=response.data["results"][length-1]["vw"];
        const low=response.data["results"][length-1]["l"];
        const high=response.data["results"][length-1]["h"];
        const close=response.data["results"][length-1]["c"];

        const fifty= await advice(stockname,50);
        const yearly= await advice(stockname,365);
        const biWeekly= await advice(stockname,10);

       


for(var i=0; i<info.length;i++) {
  if(i!==info.length-1){
prices=prices+ info[i]["c"]+",";
  }
else{
  prices=prices+ info[i]["c"];
}


          
        }

        res.render("analysis.ejs", {
          stock:stockname,
          open:open,
          close:close,
          volume:volume,
          vw:volumeWeighted,
          high:high,
          low:low,
          BiWeekly:biWeekly,
          Fifty: fifty,
          Yearly:yearly,
          loggedin:req.isAuthenticated(),
          prices:prices,
          number:90

         });
        
    
  } 
      catch (error) {
        console.log(error.message);
        res.render("analysis.ejs", {
          error: "Wrong stock name, try again"
    });
  }      

  });

  app.get("/news", async (req, res) => {
    
    var content=[];
    var image=[];
    var author=[];
    var title=[];
    var time=[];
    var publisher=[];
    var url=[];

    try{
          const response = await axios.get(API_URL +`/v2/reference/news?ticker=AAPL&order=desc&limit=40`,config);

          const info=response.data["results"];

  
  for(var i=0; i<info.length;i++) {
    var slicedTime= info[i]["published_utc"].split("T");
    content.push(info[i]["description"]);
    image.push(info[i]["image_url"]);
    title.push(info[i]["title"]);
    author.push(info[i]["author"]);
    time.push(slicedTime.splice(0,2));
    publisher.push(info[i]["publisher"]["name"]);
    url.push(info[i]["article_url"]);
  }
    
      
          res.render("news.ejs", {
            content:content,
            image:image,
            title:title,
            time:time,
            publisher:publisher,
            author:author,
            url:url,
            loggedin:req.isAuthenticated()
           });
               
    } 
  
        catch (error) {
          console.log(error.message);
      }
        
  
    });

    app.post("/news/choose", async (req, res) => {

      var content=[];
      var image=[];
      var author=[];
      var title=[];
      var time=[];
      var publisher=[];
      var url=[];
      var stockname=req.body.stock;
      stockname= stockname.toUpperCase();

      try{
            const response = await axios.get(API_URL +`/v2/reference/news?ticker=${stockname}&order=desc&limit=40`,config);

            const info=response.data["results"];
;
    
    for(var i=0; i<info.length;i++) {
      var slicedTime= info[i]["published_utc"].split("T");
      
      content.push(info[i]["description"]);
      image.push(info[i]["image_url"]);
      title.push(info[i]["title"]);
      author.push(info[i]["author"]);
      time.push(slicedTime.splice(0,2));
      publisher.push(info[i]["publisher"]["name"]);
      url.push(info[i]["article_url"]);
    }
      
        
            res.render("news.ejs", {
              content:content,
              image:image,
              title:title,
              time:time,
              publisher:publisher,
              author:author,
              url:url,
              stock:stockname,
              loggedin:req.isAuthenticated()
             });
            
        
      } 
    
          catch (error) {
            console.log(error.message);
           
        }
           
    
      });



      app.get("/signin", async (req, res) => {
      
        res.render(__dirname + "/views/signin.ejs");
      });

      app.get("/failedlogin", (req, res) => {
        res.render("signin.ejs", {
          error:"Wrong email/password"
         });
      });


      app.get("/blog", async (req, res) => {
         
          if(req.isAuthenticated()){

            var postsInternal= await getPosts();
            start=false;

            res.render("blog.ejs", {
              posts:postsInternal,
              author: req.user.account_name
             });
            }

          else{
            res.render(__dirname + "/views/signin.ejs");
          }
        });

      app.get("/write", async(req, res) => {
          
          if(req.isAuthenticated()){
            res.render(__dirname + "/views/write.ejs");
            }
            else{
              res.render(__dirname + "/views/signin.ejs");
         
            }
        });
        
      app.post("/write", async (req, res) => {
  
          var txt= req.body.text;
          var subj= req.body.subject;
          const time= new Date();
          if(txt.length>0 && subj.length>0) {
          await db.query(
            "INSERT INTO posts (author,time,content,title) VALUES ($1, $2,$3,$4)",
            [`${req.user.account_name}`,`${time}`,`${txt}`,`${subj}`]
          );

          res.redirect("/blog");
        }
        else{
          res.redirect("/write");
        }
          
          }); 
        
        
      
      app.post('/blog/:myVariable', (req,res) =>{
          var id=req.params.myVariable;
          var formId=0;
          var charArr=id.split(":");
          var form=charArr[charArr.length-1];
        
        console.log("my variable is: " +id+" formId: "+form);
        try {
          db.query(
            `Delete from posts where id=${form};`
          );

        res.redirect("/blog");
        }
        catch(err){
          console.log(err);
          console.log(err.stack);
        }
        
          
        });
        

        
      app.get('/write/:myVariable', async (req,res) =>{
        var id=req.params.myVariable;
        console.log(id);
      var charArr=id.split(":");
      console.log("after split "+charArr);
      var form=charArr[charArr.length-1];
      console.log(form);
      var userEdit =  await db.query(`SELECT * FROM posts where id=${form}; `);
      var userEdit2=userEdit.rows[0];

          res.render("write.ejs", {
            cont: userEdit2.content,
            title: userEdit2.title,
            targetform:form
          });
        
        });

        
        
      app.post('/write/:myVariable', (req, res) => {

    var formId2= req.params.myVariable;
    if(req.body.text.length>0 && req.body.subject.length>0) {
    var txt= "'"+req.body.text+"'";
    var subj= "'"+req.body.subject+"'";
    var formId= req.params.myVariable
    var realTime= new Date();
    var time= "'"+new Date()+"'";

    try{
   db.query(
      `Update posts Set 
      title = ${subj},
       content = ${txt},
       time = ${time}
       where id=${formId} `
    );

    res.redirect("/blog");
  } 
  catch(err){
    console.log(err);
    console.log(err.stack);
  }
}else{
  res.redirect(`/write/:${formId2}`); 
}
  
    }); 
  

    app.post("/signup", async (req,res) =>{
    var pass= req.body.password;
     var pass2=req.body.password2;
      var eml=req.body.email;
      var username=req.body.username;
      var taken=false;
      var error= "Username/email are already taken";
      var error2= "Your password is less than 10 characters";
      var error3="Your Username/email can not be empty";
      var error4="Your passwords don't match";
      taken =await checkUserCredentials(eml,username);
      
      setTimeout(async() => {
       console.log(taken);
       
        if(taken==true){
          res.render("signin.ejs", {
            errorOriginal:error
           });
        }
       else if(pass.length<10){

          res.render("signin.ejs", {
            errorsize:error2
           });
        }
        else if (username.length==0 || eml.length==0){
          res.render("signin.ejs", {
            errorsize:error3
           });
        }
        else if (pass!=pass2){
          res.render("signin.ejs", {
            errorsize:error4
           });
        }
        else{
          bcrypt.hash(pass,saltRounds, async(err,hash)=>{

            if(err){
              console.log(err);
            } 
            else{
              var success="Success";
              const result= await db.query(
                "INSERT INTO users (email,password,account_name) VALUES ($1,$2,$3) RETURNING *",
                [`${eml}`,`${hash}`,`${username}`]
              );
              const user = result.rows[0];

            res.render("signin.ejs", {
              success:success
             });

             
          }
          })
          
        }
        
      },100);
     
      
    });

    app.get("/signout", (req, res) => {
      req.logout(function (err) {

        if (err) {
          return next(err);
        }
        else{
        res.redirect("/signin");
        }

      });

    });
        
        async function checkUserCredentials(eml,username){
          const usersInfo =  await db.query("SELECT * FROM users");
      
         for(var i=0; i< usersInfo.rowCount;i++){

            if(usersInfo.rows[i].email==eml || usersInfo.rows[i].account_name==username ){
              return true;
            }
          }
        
          return false;
               
        }
        async function checkEmailPresence(eml){
          const usersInfo =  await db.query("SELECT * FROM users");
        
         for(var i=0; i< usersInfo.rowCount;i++){

          if(usersInfo.rows[i].email==eml ){
              return true;
            }
          }
        
          return false;
        
        }

        /**
         * 
         * @param {*} stockname 
         * @param {*} period 
         * @returns advice
         * helper function to determine the advice to give to users for each investment period
         */

    async function advice(stockname,period){
    
      var leniency= 0;
      if(period===365){
       
        leniency=2;
      }
      else if (period===50){
        leniency=1;
      }

    var prices=[];
    var news=[];
    var averageGrowth=0;
    var averageNews=0;
    var averageScore=0;
    var positiveScore=0;
    var negativescore=0;
    var neutralScore=0;
    var date= new Date();
    var start= new Date();

    start.setDate(date.getDate()-period);
  
    var day1= start.getDate();
    var month1= start.getMonth();
    month1++;
    var year1= start.getFullYear();
  
    var day= date.getDate();
    var month= date.getMonth();
    month++;
    var year= date.getFullYear();
    console.log(day+" "+month +" "+year);
    console.log(day1+" "+month1 +" "+year1);

    if(leniency===2){
      period=0;
    }

    if(day<10){
      day="0"+day;
    }

    if(day1<10){
      day1="0"+day1;
    }

    if(month<10){
      month="0"+month;
    }

    if(month1<10){
      month1="0"+month1;
    }

    try{
          const response = await axios.get(API_URL +`/v2/aggs/ticker/${stockname}/range/1/day/${year1}-${month1}-${day1}/${year}-${month}-${day}?adjusted=true&sort=asc`,config);
          const response2 = await axios.get(API_URL +`/v2/reference/news?ticker=${stockname}&order=desc&limit=100`,config);
          const data= response.data["results"];
          const data2= response2.data["results"];

          for (var i= 0;i<data.length-1;i++){
            var var1 = parseFloat(data[i]["c"]);
            var var2 = parseFloat(data[i+1]["c"]);
            var toadd= (var2-var1)/var1;
            prices.push(toadd);
          }

          for (var i= 0;i<prices.length;i++){
            averageGrowth=averageGrowth+prices[i];
            
          }
          averageGrowth=averageGrowth/prices.length;

          
          if(period !==0){
          for (var i=0;i<period;i++){

          try {
            if(typeof(data2[i]["insights"])=="object") {
            var var1=data2[i]["insights"];

            for (var j= 0;j<var1.length;j++){

                if(var1[j]["ticker"]==`${stockname}`) {
                
                    var toadd = var1[j]["sentiment"];
                    news.push(toadd);
                }
            }

            }
            
          }
          catch(err){
            console.log(err);

          }
        }
          
          for (var i= 0;i<news.length;i++){
            if(news[i]=="positive"){
                positiveScore++;
            }
            else if (news[i]=="negative"){
                negativescore++;
            }
            else if (news[i]=="bearish"){
              negativescore=negativescore+2
          }
          else if (news[i]=="bullish"){
            positiveScore=positiveScore+2;
        }
        else{
          neutralScore++;
        }    
          }

          if(positiveScore===negativescore){
            averageNews=0;
          }
          else{
          var keep=Math.max(positiveScore,neutralScore,negativescore);
          var tokeep=Math.floor((keep/news.length)*100);

        if (tokeep >25 && tokeep<=50){
             if(keep===positiveScore){
              averageNews=1/3;
            }
            else if(keep===negativescore) {
            averageNews=-1/3;
            }
            else{
              var posOverNeg=positiveScore/negativescore;
              if(posOverNeg>1){
                averageNews=posOverNeg*1/3;
              }
              else if(posOverNeg<1){
                posOverNeg=2-posOverNeg;
                averageNews=(posOverNeg*1/3)*-1;
              }
              else{
                averageNews=0;
              }
            }
        }
        else if (tokeep>50 && tokeep<=75){

          if(keep===positiveScore){
            averageNews=2/3;
          }
          else if(keep===negativescore) {
            averageNews=-2/3;
          }
          else{
            averageNews=0;
          }
      }

    else{
      
      if(keep===positiveScore){
        averageNews=1;
      }

      else if(keep===negativescore) {
            averageNews=-1;
      }

      else{
          averageNews=0;
      }
    }
  }
}

          averageScore=(averageGrowth*100)+averageNews/2;
          console.log("average score is "+averageScore);
        return averageScore + averageScore*(leniency/2);

          }

          catch (error) {
            console.log(error.message);
            return "stock not found";
        }
          
        }

        /**
         * Authentication related methods
         */
        
        app.post("/signin/check", passport.authenticate("local",{
          successRedirect:"/blog",
          failureRedirect:"/failedlogin",
         }));
         
         passport.use(new Strategy(async function verify(username,password, cb) {
             try {
               const emailToPass="'"+username+"'";
               const result = await db.query(`SELECT * FROM users where email=${emailToPass} `);
               const user= await result.rows[0];

               var checkemail= await checkEmailPresence(username);
               if(checkemail==true){
                 const pass=result.rows[0].password;
                 bcrypt.compare(password, pass, (err, bool) => {

                   if (err) {
                     console.error(err);
                     return cb(err);
                   } else {
                     if (bool) {
                       console.log(bool);
                       return cb(null, user);
                     } else {
                       return cb(null, false);
                     }
                   }
                 });
               

               } else {
                 return cb(null, false);
               }
               
             } catch (err) {
               console.log(err);
             }
           })
         );
         
         
         passport.serializeUser((user, cb) => {
           cb(null, user);

         });
         
         passport.deserializeUser((user, cb) => {
           cb(null, user);

         });


  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

  });
  