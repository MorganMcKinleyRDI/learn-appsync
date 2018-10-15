'use strict'


const AWS = require('aws-sdk')
AWS.config.update({region:'eu-west-1'})
const kinesis = new AWS.Kinesis()
const lambda = new AWS.Lambda({  
  region: "eu-west-1"
});
const dynamo = new AWS.DynamoDB.DocumentClient()
const streamName = process.env.STREAM_NAME
const writerFunctionName = process.env.WRITER_NAME
const messagesTableName = process.env.MESSAGES_TABLE_NAME
const uuidv1 = require('uuid/v1');

exports.graphql = (event, context, callback) => {
	console.log('Received event {}', JSON.stringify(event, 3))

	const consumerKey = event.arguments.consumer_key
	const consumerSecret = event.arguments.consumer_secret

	console.log('Got an Invoke Request.')
	switch (event.field) {
		case 'addMessage':

			const eventEpoch = (new Date).getTime();
			const eventDbId = uuidv1();
			const messageEvent = {
				id: event.arguments.id,
      	username: event.handle,
        message: event.arguments.message,
        timestamp: eventEpoch,
				created: eventEpoch
    	}
      const sendMessageEvent = JSON.stringify({
      	event_type: "SENT_MESSAGE",
        event: messageEvent
      })
      const invokeWriterParams = {
        FunctionName: writerFunctionName,
        InvocationType: "RequestResponse",
        Payload: sendMessageEvent
      }

      lambda.invoke(invokeWriterParams, function(error, data) {
        if (error) {
          console.error(JSON.stringify(error))
          return new Error(`Error printing messages: ${JSON.stringify(error)}`)
        } else if (data) {
          console.log('Writer Results:', data)
        }
      })

			callback(null, messageEvent)
			break
		
		case 'getMessage':

    	let params = {
	      TableName: messagesTableName,
	      IndexName: 'username-created-index',
		    KeyConditionExpression: 'username = :i',
		    ExpressionAttributeValues: {
		      ':i': event.arguments.id
		    }
	    };
	    
	    let dbList = dynamo.query(params).promise()
	    
	    dbList.then( (data) => {
        if (!data) {
          console.log("NO ITEMS")
          callback(null, "NO ITEMS")
          return
        }
        console.log("LISTING SUCCESSFUL")
        console.log(data.Items)
        callback(null, data.Items)
	    }).catch( (err) => { 
        console.log(`LISTING FAILED, WITH ERROR: ${err}`)
        callback(null, err)
	    });
	    break

		default: 

			callback(`Unknown field, unable to resolve ${event.field}`, null)
			break
	}
}

exports.writer = (event, context, callback) => {
	console.log('Passed event: ' + JSON.stringify(event))
	const stream_event = event
	const event_type = stream_event.event_type
	let response = {}
	console.log(stream_event)

  function _waitForStreamToBecomeActive(callback) {
    kinesis.describeStream({StreamName : streamName}, function(err, data) {
      if (!err) {
        console.log('Current status of the stream is: ', data.StreamDescription.StreamStatus)
        if (data.StreamDescription.StreamStatus === 'ACTIVE') {
          console.log('Stream is active.')
          callback()
        }
        else {
          setTimeout(function() {
            _waitForStreamToBecomeActive(callback)
          }, 1000 * 5)
        }
      } else {
        console.log('Error: ' + err)
        return
      }
    })
  }
  
  function _writeToKinesis() {
    var currTime = new Date().getMilliseconds()
    var sensor = 'test-' + Math.floor(Math.random() * 100000)
    var reading = Math.floor(Math.random() * 1000000)

    var record = JSON.stringify({
      stream_event
    })
  
    var recordParams = {
      Data : record,
      PartitionKey : sensor,
      StreamName : streamName
    }
  
    kinesis.putRecord(recordParams, function(err, data) {
      if (err) {
        console.log(err)
      }
      else {
        console.log('Successfully sent data to Kinesis.')

        const response = {
          statusCode: 200,
          body: JSON.stringify({
            message: `${event_type} - Successfully sent data to Kinesis.`
          })
        }

        callback(null, response)
      }
    })
  }
  
  _waitForStreamToBecomeActive( function() {
    _writeToKinesis()
  })

} 

exports.reader = (event, context, callback) => {
  event.Records.forEach(function(record) {
    // Kinesis data is base64 encoded so decode here
    const stream_event = JSON.parse(new Buffer(record.kinesis.data, 'base64').toString('utf-8')).stream_event;
    console.log('Decoded payload:', stream_event);
		console.log(stream_event.event_type);

		switch (stream_event.event_type) {
	    case "SENT_MESSAGE": 

			  const eventItem = {
			    id: stream_event.event.id,
			    username: stream_event.event.username,
			    message: stream_event.event.message,
			    timestamp: stream_event.event.timestamp,
			    created: stream_event.event.created
			  }

			  const eventParams = {
			    TableName: messagesTableName,
			    Item: eventItem
			  }

			  const dbPut = (params) => { return dynamo.put(eventParams).promise() };
			  dbPut(eventParams).then( (data) => {
			    console.log(`PUT EVENT ITEM SUCCEEDED WITH event = ${data}`);
			  }).catch( (err) => { 
			    console.log(`PUT EVENT ITEM FAILED FOR event = SENT_MESSAGE, WITH ERROR: ${err}`);
			  })

        break;
	    default:
        callback(null, `Nothing to do.`);
		}

  });

  callback(null, "Returned with nothing to do.");
};