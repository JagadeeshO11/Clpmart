import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app=express();
app.use(helmet());
app.use(cors({origin:(process.env.CLIENT_ORIGINS||'http://localhost:5173').split(',').map(x=>x.trim()),credentials:true}));
app.use(express.json({limit:'1mb'}));
app.use('/api',rateLimit({windowMs:15*60*1000,limit:300,standardHeaders:true,legacyHeaders:false}));

const UserSchema=new mongoose.Schema({name:{type:String,required:true},email:{type:String,required:true,unique:true,lowercase:true},passwordHash:{type:String,required:true},role:{type:String,enum:['customer','seller','admin'],default:'customer'},sellerStatus:{type:String,enum:['none','pending','approved','rejected'],default:'none'},shopName:String,phone:String},{timestamps:true});
const ProductSchema=new mongoose.Schema({title:{type:String,required:true},description:String,price:{type:Number,required:true,min:0},category:{type:String,default:'General'},image:{type:String,default:''},stock:{type:Number,default:0,min:0},seller:{type:mongoose.Schema.Types.ObjectId,ref:'User'},sellerName:String,status:{type:String,enum:['pending','active','rejected'],default:'pending'}},{timestamps:true});
const OrderSchema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User'},items:[{product:{type:mongoose.Schema.Types.ObjectId,ref:'Product'},title:String,quantity:Number,price:Number,seller:String}],total:Number,status:{type:String,default:'placed'},paymentStatus:{type:String,default:'pending'},address:String},{timestamps:true});
const User=mongoose.models.User||mongoose.model('User',UserSchema);
const Product=mongoose.models.Product||mongoose.model('Product',ProductSchema);
const Order=mongoose.models.Order||mongoose.model('Order',OrderSchema);

const demo=[
 {_id:'demo-1',title:'Wireless Bluetooth Headphones',description:'Comfort fit with rich sound.',price:1299,category:'Electronics',image:'https://images.unsplash.com/photo-150 áudio?auto=format&fit=crop&w=700&q=80',stock:24,sellerName:'SoundHub'},
 {_id:'demo-2',title:'Everyday Cotton T-shirt',description:'Soft breathable cotton.',price:499,category:'Fashion',image:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80',stock:50,sellerName:'ThreadTown'},
 {_id:'demo-3',title:'Minimal Desk Lamp',description:'Warm light for focused evenings.',price:899,category:'Home',image:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80',stock:12,sellerName:'NestWorks'},
 {_id:'demo-4',title:'Everyday Backpack',description:'Roomy, durable daily carry.',price:999,category:'Accessories',image:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80',stock:18,sellerName:'CarryCo'}
];
const tokenFor=u=>jwt.sign({id:u._id,role:u.role},process.env.JWT_SECRET||'dev-only-change-me',{expiresIn:'7d'});
const auth=(req,res,next)=>{try{const t=(req.headers.authorization||'').replace(/^Bearer /,'');if(!t)throw Error();req.user=jwt.verify(t,process.env.JWT_SECRET||'dev-only-change-me');next()}catch{res.status(401).json({error:'Please sign in'})}};
const allow=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Not allowed'});
app.get('/api/health',(req,res)=>res.json({ok:true,service:'clpmart-api'}));
app.post('/api/auth/register',async(req,res)=>{try{const {name,email,password}=req.body;if(!name||!email||!password||password.length<8)return res.status(400).json({error:'Name, email and password (8+ characters) are required'});const user=await User.create({name,email,passwordHash:await bcrypt.hash(password,12)});res.status(201).json({token:tokenFor(user),user:{id:user._id,name:user.name,email:user.email,role:user.role}})}catch(e){res.status(400).json({error:e.code===11000?'Email already registered':'Could not create account'})}});
app.post('/api/auth/login',async(req,res)=>{const user=await User.findOne({email:String(req.body.email||'').toLowerCase()});if(!user||!await bcrypt.compare(req.body.password||'',user.passwordHash))return res.status(401).json({error:'Invalid email or password'});res.json({token:tokenFor(user),user:{id:user._id,name:user.name,email:user.email,role:user.role,sellerStatus:user.sellerStatus}})});
app.get('/api/products',async(req,res)=>{if(!mongoose.connection.readyState)return res.json(demo);const q={status:'active'};if(req.query.category&&req.query.category!=='All')q.category=req.query.category;if(req.query.search)q.title={$regex:String(req.query.search),$options:'i'};res.json(await Product.find(q).sort({createdAt:-1}).limit(100))});
app.get('/api/products/:id',async(req,res)=>{if(req.params.id.startsWith('demo-'))return res.json(demo.find(p=>p._id===req.params.id)||{});const p=await Product.findOne({_id:req.params.id,status:'active'});if(!p)return res.status(404).json({error:'Product not found'});res.json(p)});
app.post('/api/seller/apply',auth,async(req,res)=>{const u=await User.findByIdAndUpdate(req.user.id,{role:'seller',sellerStatus:'pending',shopName:String(req.body.shopName||'').slice(0,80)},{new:true});res.json({sellerStatus:u.sellerStatus,message:'Application submitted for review'})});
app.get('/api/seller/products',auth,allow('seller','admin'),async(req,res)=>res.json(await Product.find({seller:req.user.id}).sort({createdAt:-1})));
app.post('/api/seller/products',auth,allow('seller','admin'),async(req,res)=>{const u=await User.findById(req.user.id);if(req.user.role!=='admin'&&u.sellerStatus!=='approved')return res.status(403).json({error:'Seller approval is required before publishing products'});const {title,description,price,category,image,stock}=req.body;if(!title||!Number.isFinite(Number(price))||Number(price)<=0)return res.status(400).json({error:'Valid title and price required'});const p=await Product.create({title,description,price:Number(price),category,image,stock:Number(stock)||0,seller:u._id,sellerName:u.shopName||u.name,status:'active'});res.status(201).json(p)});
app.post('/api/orders',auth,async(req,res)=>{const {items,address}=req.body;if(!Array.isArray(items)||!items.length||!address)return res.status(400).json({error:'Cart items and delivery address are required'});const ids=items.map(i=>i.productId).filter(id=>mongoose.isValidObjectId(id));const products=await Product.find({_id:{$in:ids},status:'active'});if(products.length!==items.length)return res.status(400).json({error:'One or more products are unavailable'});const lines=products.map(p=>{const row=items.find(i=>i.productId===String(p._id));const quantity=Math.max(1,Math.min(20,Number(row.quantity)||1));if(p.stock<quantity)throw Error('Insufficient stock for '+p.title);return {product:p._id,title:p.title,quantity,price:p.price,seller:p.sellerName}});for(const line of lines)await Product.updateOne({_id:line.product},{$inc:{stock:-line.quantity}});const order=await Order.create({user:req.user.id,items:lines,total:lines.reduce((s,i)=>s+i.price*i.quantity,0),address:String(address).slice(0,500)});res.status(201).json({order,payment:{mode:'placeholder',message:'Order placed. Connect a verified payment provider before accepting online payments.'}})});
app.get('/api/orders/mine',auth,async(req,res)=>res.json(await Order.find({user:req.user.id}).sort({createdAt:-1})));
app.get('/api/admin/sellers',auth,allow('admin'),async(req,res)=>res.json(await User.find({sellerStatus:'pending'}).select('-passwordHash')));
app.patch('/api/admin/sellers/:id',auth,allow('admin'),async(req,res)=>{const status=req.body.status;if(!['approved','rejected'].includes(status))return res.status(400).json({error:'Invalid status'});res.json(await User.findByIdAndUpdate(req.params.id,{sellerStatus:status},{new:true}).select('-passwordHash'))});
app.get('/api/seller/orders',auth,allow('seller','admin'),async(req,res)=>{const p=await Product.find({seller:req.user.id}).select('_id');res.json(await Order.find({'items.product':{$in:p.map(x=>x._id)}}).sort({createdAt:-1}))});

const port=process.env.PORT||4000;
if(process.env.MONGODB_URI){mongoose.connect(process.env.MONGODB_URI).then(async()=>{console.log('MongoDB connected');if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){const email=process.env.ADMIN_EMAIL.toLowerCase();if(!await User.exists({email}))await User.create({name:'Clpmart Admin',email,passwordHash:await bcrypt.hash(process.env.ADMIN_PASSWORD,12),role:'admin'});}}).catch(e=>console.error('MongoDB connection failed:',e.message));}
app.listen(port,()=>console.log('Clpmart API listening on '+port));
