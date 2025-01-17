const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const Customer = require('../models/customer')
const getRandomInt = require('../common/randomInt')
const { JWT_LOGIN_KEY } = require('../constants/jwt_token')

const getById = async (req, res) => {
  try {
    if (!(req.query._id)) {
      throw ({name: 'ParameterError', message: 'Missing required input'}) 
    }

    res.status(200).json(await Customer.findOne(req.query))
  } catch (error) {
    res.status(400).json(error)
  }
}

const get = async (req, res) => {
  try {
    res.status(200).json(await Customer.find(req.query))
  } catch (error) {
    res.status(400).json(error)
  }
}

const register = async (req, res) => {
  try {
    res.status(200).json(await createCustomer(req.body))
  } catch (error) {
    console.log(error)
    res.status(400).json(error)
  }
}

const login = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!(username && password)) 
      throw ({name: 'ParameterError', message: 'Missing required input'}) 

    let currentUser = await Customer.findOne({username})
    if (currentUser && await bcrypt.compare(password, currentUser.password)){
      const token = jwt.sign(
        { _id: currentUser._id, role: 'customer' },
        JWT_LOGIN_KEY,
        {
          expiresIn: '4h',
        }
      )

      currentUser.password = undefined
      res.status(200).json({ currentUser, token })
    }else {
      throw ({name: 'LoginError', message: 'Invalid Credentials'}) 
    }

  } catch (error) {
    res.status(400).json(error)
  }
}

const update = async (req, res) => {
  try {
    if (!(req.query._id)) {
      throw ({name: 'ParameterError', message: 'Missing required input'}) 
    }

    const currentUser = await Customer.findOne(req.query)
    const userInputs = req.body

    if (!currentUser) {
      throw ({name: 'ParameterError', message: 'User not found.'}) 
    } 
    if (userInputs.username) {
      const otherUser = await Customer.findOne({username: userInputs.username})
      if (otherUser && currentUser._id !== otherUser._id)
        throw ({name: 'ParameterError', message: 'This username is already used.'}) 
    }

    // [ ] needs authen before do this 
    if (userInputs.password) userInputs.password = await bcrypt.hash(req.body.password, 10)

    let result = await Customer.findOneAndUpdate(req.query, userInputs, {new: true})
    result.password = undefined

    res.status(200).json(result)
  } catch (error) {
    console.log(error)
    res.status(400).json(error)
  }
}

const deleteByID = async (req, res) => {
  try {
    if (!(req.query._id)) {
      throw ({name: 'ParameterError', message: 'Missing required input'}) 
    }
    if (!(await Customer.findOne(req.query))) {
      throw ({name: 'ParameterError', message: 'User not found.'}) 
    }
    res.status(200).json(await Customer.findOneAndDelete(req.query))
  } catch (error) {
    res.status(400).json(error)
  }
}


// for test
const randCreateCustomer = async (req, res) => {
  try {
    for (let i = 1; i <= 20; i++) {
      let body = {
        username: `user-g1-${i}`,
        password: `pass-g1-${i}`,
        name: `user-g1-${i}`,
        gender: getRandomInt(1,2) === 1 ? 'MALE' : 'FEMALE',
        age: 'UNDER_22', 
        occupation: 'Student',
        tags: [
          {key: 1, value: 'สุเทพ'},
          {key: 2, value: 'CHEAP'},
          {key: 3, value: getRandomInt(1,2) === 1 ? 'EVENING' : 'NIGHT'}
        ]
      }
      await createCustomer(body)
    }
    for (let i = 1; i <= 20; i++) {
      let body = {
        username: `user-g2-${i}`,
        password: `pass-g2-${i}`,
        name: `user-g2-${i}`,
        gender: 'FEMALE',
        age: getRandomInt(1,2) === 1 ? 'UNDER_22' : '23_TO_40',
        tags: [
          {key: 1, value: getRandomInt(1,2) === 1 ? 'สุเทพ' : 'แม่เหียะ'},
          {key: 3, value: 'AFTERNOON'},
          {key: 6, value: 'TOURIST'}
        ]
      }
      await createCustomer(body)
    }
    for (let i = 1; i <= 20; i++) {
      let body = {
        username: `user-g3-${i}`,
        password: `pass-g3-${i}`,
        name: `user-g3-${i}`,
        gender: getRandomInt(1,2) === 1 ? 'MALE': 'FEMALE',
        age: '23_TO_40',
        tags: [
          {key: 3, value: getRandomInt(1,2) === 1 ? 'AFTERNOON' : 'EVENING'},
          {key: 5, value: 'NORMAL'},
          {key: 6, value: 'OFFICE_WORKER'}
        ]
      }
      await createCustomer(body)
    }
    for (let i = 1; i <= 20; i++) {
      let body = {
        username: `user-g4-${i}`,
        password: `pass-g4-${i}`,
        name: `user-g4-${i}`,
        gender: getRandomInt(1,2) === 1 ? 'MALE': 'FEMALE',
        age: getRandomInt(1,2) === 1 ? '41_TO_60': 'AFTER_61',
        tags: [
          {key: 3, value: getRandomInt(1,2) === 1 ? 'AFTERNOON' : 'EVENING'},
          {key: 4, value: 'LARGE'},
          {key: 6, value: 'TOURIST'}
        ]
      }
      await createCustomer(body)
    }
    for (let i = 1; i <= 20; i++) {
      let body = {
        username: `user-g5-${i}`,
        password: `pass-g5-${i}`,
        name: `user-g5-${i}`,
        gender: 'MALE',
        age: getRandomInt(1,2) === 1 ? '23_TO_40': '41_TO_60',
        tags: [
          {key: 1, value: 'หนองหอย'},
          {key: 2, value: 'HIGH'},
          {key: 4, value: 'SMALL'}
        ]
      }
      await createCustomer(body)
    }
    res.status(200).json({status: 'ok'})
  } catch (error) {
    res.status(400).json(error)
  }
}


// functions
const createCustomer = async (body) => {
  if (!(body.username && body.password && body.name)) {
    throw ({name: 'ParameterError', message: 'Missing required input'}) 
  }
  if (await Customer.findOne({username: body.username})) {
    throw ({name: 'ParameterError', message: 'This username is already used.'}) 
  }

  const highestUserId = await Customer.findOne({}).sort({_id: -1}).exec();
  let userInputs = {
    _id: highestUserId ? highestUserId._id + 1 : 1,
    ...body,
    password: await bcrypt.hash(body.password, 10),
  }

  let result = await Customer.create(userInputs)
  result.password = undefined

  return result
}


module.exports = {
  getById,
  get,
  register,
  login,
  update,
  deleteByID,
  randCreateCustomer
}