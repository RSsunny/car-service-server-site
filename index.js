const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser=require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// midlawer

app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser())

// custom middlewares

const logger=async(req,res,next)=>{
  console.log('called', req.host,req.originalUrl);
  next()
}

const verifyToken=async(req,res,next)=>{
  const token=req.cookies?.token
  console.log('verify token in middelawers', token );
  if(!token){
    return res.status(401).send({massage:'notAthorized'})

  }
  jwt.verify(token,process.env.API_TOKEN_SCERET,(err,decoded)=>{
    if(err){
      console.log(err);
      return res.status(401).send({massage:'unAuthorized'})
    }
    // console.log(decoded.usereemail);
    req.user=decoded
    next()
  })
  
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8eq7kh0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const serviceCollaction = client.db("serviceDB").collection("service");
    const bookingCollaction = client.db("carServiceDB").collection("booking");

    app.get("/service",logger,  async (req, res) => {

      // console.log('this is cookies',req.cookies.token);
      const result = await serviceCollaction.find().toArray();
      res.send(result);
    });

    app.get("/service/:id",logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollaction.findOne(query);
      res.send(result);
    });

    app.post("/booking",verifyToken, async (req, res) => {
      console.log(req.user?.usereemail);
      const book = req.body;
      // if(req.query?.email!==req.user?.email){
      //   return res.status(401).send({massage:'forbidden'})
      // }
      const result = await bookingCollaction.insertOne(book);
      res.send(result);
    });

    app.get("/booking",verifyToken, async (req, res) => {
      
      if(req.query?.email!==req.user?.usereemail){
        return res.status(401).send({massage:'forbidden'})
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollaction.find(query).toArray();
      res.send(result);
    });

    //  token
    app.post("/jwt", async (req, res) => {
      const data = req.body;
      
      const token=jwt.sign(
         data,process.env.API_TOKEN_SCERET, { expiresIn: '1h' });
      // const result=await
      res.cookie('token',token,{
        httpOnly:true,
        secure:false,
        // sameSite:'none'
      }).send({success:true});
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server site running");
});
app.listen(port, () => {
  console.log("server site running", port);
});
