const axios = require('axios')
const crypto = require('crypto')

const Promotion = require('../models/promotion')
const randomInt = require('../common/randomInt')

const create = async (req, res) => {
  try {
    const { 
      codeDetail = `promotion of shop ${req.body._shopId}`,
      expiredLength = 30,
      _shopId,
      amount = 1 
    } = req.body
    if (!(_shopId)) throw ({name: 'ParameterError', message: 'Missing required input'}) 

    const shopResult = await axios.get(`http://auth-node:3002/shop/getById`,
      {
        params: { _id: parseInt(_shopId, 10) },
        headers:
        {
          'Content-Type': 'application/x-www-form-urlencoded',
          'token': 'skip'
        }
      }
    )
    if (!(shopResult && shopResult.data)) throw ({name: 'ParameterError', message: 'User not found.'})
    
    let result = []
    for (let i = 0; i < amount; i++) {
      const highestPromotionId = await Promotion.findOne({}).sort({_id: -1}).exec();
      let promotionInputs = {
        _id: highestPromotionId ? highestPromotionId._id + 1 : 1,
        _shopId,
        codeDetail,
        codeString: crypto.randomBytes(20).toString('hex'),
        dateCreate: new Date(),
        dateExpired: dateAfter(expiredLength),
        status: 'AVAILABLE'
      }

      result.push(await Promotion.create(promotionInputs))
    }
    
    res.status(200).json(result)
  } catch (error) {
    console.log(error)
    res.status(400).json(error)
  }
}

const getShopCodes = async (req, res) => {
  try {
    const { _shopId } = req.query
    if (!(_shopId)) throw ({name: 'ParameterError', message: 'Missing required input'}) 

    await validateCodes(_shopId)
    const availableCode = await Promotion.find({
      _shopId,
      status: 'AVAILABLE'
    })
    const activatedCode = await Promotion.find({
      _shopId,
      status: 'ACTIVATED'
    }).sort({ usedTimestamp: -1 }).limit(10)

    res.status(200).json({ available: availableCode, activated: activatedCode})
  } catch (error) {
    console.log(error)
    res.status(400).json(error)
  }
}

const getCustomerCodes = async (req, res) => {
  try {
    const { _customerId } = req.query
    if (!(_customerId)) throw ({name: 'ParameterError', message: 'Missing required input'}) 

    await validateCodes(_customerId)
    const claimedCode = await Promotion.find({
      _customerId,
      status: 'CLAIMED'
    })

    res.status(200).json(claimedCode)
  } catch (error) {
    console.log(error)
    res.status(400).json(error)
  }
}

const customerClaimCode = async (req, res) => {
  try {
    const { _customerId } = req.query
    if (!(_customerId)) throw ({name: 'ParameterError', message: 'Missing required input'}) 

    await validateCodes(_customerId)

    const availableCodes = await Promotion.find({
      status: 'AVAILABLE'
    })

    if(availableCodes && availableCodes.length > 0) {
      const idx = randomInt(0, availableCodes.length-1)

      const claimedCode = await Promotion.findOneAndUpdate(
        { _id: availableCodes[idx]._id },
        {
          _customerId,
          status: 'CLAIMED',
        },
        { new: true }
      )
      res.status(200).json({claimedCode})
    }
    else res.status(200).json({claimedCode: {}})

  } catch (error) {
    console.log(error)
    res.status(400).json(error)
  }
}

const customerActivatedCode = async (req, res) => {
  try {
    const { _customerId, codeString } = req.query
    if (!(_customerId && codeString)) throw ({name: 'ParameterError', message: 'Missing required input'}) 

    const claimedCode = await Promotion.findOne({
      status: 'CLAIMED',
      _customerId,
      codeString
    })
    if (!claimedCode) throw ({name: 'PromotionError', message: 'Code not found'}) 

    if ( claimedCode.dateExpired <= new Date()) {
      await Promotion.findOneAndUpdate({ _id: claimedCode._id}, { status: 'EXPIRED' }, {new: true})
      throw ({name: 'PromotionError', message: 'Code is expired'})
    }

    const result = await Promotion.findOneAndUpdate(
      { _id: claimedCode._id },
      {
        status: 'ACTIVATED',
        usedTimestamp: new Date()
      },
      { new: true}
    )

    res.status(200).json(result)
  } catch (error) {
    console.log(error)
    res.status(400).json(error)
  }
}

const validateCodes = async (_shopId, _customerId) => {
  if (!(_shopId || _customerId)) throw ({name: 'ParameterError', message: 'Missing required input for code validating'})
  
  let allCodes
  if(_shopId) allCodes = await Promotion.find({ _shopId })
  else  allCodes = await Promotion.find({ _customerId })

  if (allCodes &&  allCodes.length > 0) {
     allCodes.map(async code => {
      if ((code.status === 'AVAILABLE' || code.status === 'CLAIMED') && code.dateExpired <= new Date()) {
        await Promotion.findOneAndUpdate({ _id: code._id }, { status: 'EXPIRED' })
      }
    })
  }

}

const dateAfter = (days) => {
  const nextDate = new Date();
  nextDate.setDate((new Date()).getDate() + parseInt(days, 10));
  return nextDate
}


module.exports = {
  create,
  getShopCodes,
  getCustomerCodes,
  customerClaimCode,
  customerActivatedCode
}