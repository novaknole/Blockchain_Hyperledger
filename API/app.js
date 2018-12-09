const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
var fabricClient = require('fabric-client');
var FabricCAClient = require('fabric-ca-client');

var fabric_ca_client, adminUser;
var client = fabricClient.loadFromConfig('./Config/ConnectionProfile.yaml');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());




var myConfig;
var configObject = {};
var channel_name = "globalchannel";
app.use(function (req, res, next) {
  let org_name = req.headers.org_name;
  client.loadFromConfig("./Config/" + org_name + ".yaml");
  myConfig = yaml.safeLoad(fs.readFileSync('./Config/ConnectionProfile.yaml', 'utf8'));
  configObject.adminPrivateKey = myConfig.organizations[org_name].adminPrivateKey.path;
  configObject.signedCert = myConfig.organizations[org_name].signedCert.path;
  configObject.certificateAuthority = {};
  var ca_name = (myConfig.organizations[org_name].certificateAuthorities)[0];
  configObject.ca_name = ca_name;
  configObject.ca_username = myConfig.certificateAuthorities[ca_name].registrar[0].enrollId;
  configObject.ca_password = myConfig.certificateAuthorities[ca_name].registrar[0].enrollSecret;
  configObject.msp_id = myConfig.organizations[org_name].mspid;
  configObject.peer = myConfig.organizations[org_name].peers[0];
 
  next()
})





app.get('/enroll_user', (req, res) => {
  var username = req.query.username;
  var password = req.query.password;
  client.initCredentialStores().then(() => {
    client.setUserContext({ username: username, password: password }).then((user) => {
      res.send({ status: 200, response: "You've been enrolled" });
    }).catch(err => {
      res.send({ status: 400, response: "Couldn't enroll the user", err });
    })
  });
});


app.post("/register_user", (req, res) => {
  var username = req.body.username;
  client.initCredentialStores().then(() => {
    fabric_ca_client = client.getCertificateAuthority();
    client.setUserContext({ username: configObject.ca_username, password: configObject.ca_password }).then((admin) => {
      fabric_ca_client.register({ enrollmentID: username, affiliation: 'org1' }, admin).then((secret) => {
        console.log("registered successfully. secret key is " + secret);
      }).then((user) => {
        res.send({ status: 200, status: "registered successfully" });
      });
    }).catch(err => {
      console.log("Couldn't enroll the admin", err);
    })
  })
});


/* createChannel is only possible by signing from organization's admin. signChannelConfig
  automatically signs it with admin keys set in connectionprofile. we could have used setAdminSigningIdentity */
app.post("/create_channel", (req, res) => {
  client.initCredentialStores().then(() => {
    let envelope_bytes = fs.readFileSync(path.join(__dirname, '../crypto-config/channel.tx'));
    var channel_config = client.extractChannelConfig(envelope_bytes);
    var signature = client.signChannelConfig(channel_config);
    var orderer = client.getOrderer('orderer0');
    let tx_id = client.newTransactionID(true);
    request = {
      config: channel_config,
      signatures: [signature],
      name: channel_name,
      orderer: orderer,
      txId: tx_id
    };

    //console.log(client);

    client.createChannel(request).then((data) => {
      console.log("I hope it created the channel", data);
    }).catch(err => {
      console.log('cant create channel', err);
    })
  })
})


app.get('/join_channel', function (req, res) {
  client.initCredentialStores().then(() => {
    var channel = client.getChannel(channel_name);
    var peer = client.getPeer(configObject.peer);
    var private_key_admin = fs.readFileSync(path.join(__dirname, configObject.adminPrivateKey));
    var certificate_admin = fs.readFileSync(path.join(__dirname, configObject.signedCert));
    client.setAdminSigningIdentity(private_key_admin, certificate_admin, configObject.msp_id);

    tx_id = client.newTransactionID(true);
    let g_request = {
      txId: tx_id
    };

    channel.getGenesisBlock(g_request).then((block) => {
      var genesis_block = block;
      tx_id = client.newTransactionID(true);
      let j_request = {
        block: genesis_block,
        txId: tx_id,
        targets:[peer]
      };
      return channel.joinChannel(j_request).then(data => {
        console.log("joined channel at least hope so", data);
      }).catch(err => {
        console.log("couldn't join the channel", err);
      });
    }).catch(err => {
      console.log("cant get genesis block", err);
    })
  }).catch(err => {
    console.log("can't get user", err);
  });

})

app.post('/install_chaincode', function (req, res) {
  var peers = [];
  var request = {};
  client.initCredentialStores().then(() => {
    var private_key_admin = fs.readFileSync(path.join(__dirname, configObject.adminPrivateKey));
    var certificate_admin = fs.readFileSync(path.join(__dirname, configObject.signedCert));
    client.setAdminSigningIdentity(private_key_admin, certificate_admin, configObject.msp_id);

    let peer = client.getPeer(configObject.peer);
    peers.push(peer);
    request.targets = peers;
    request.chaincodePath = '/home/gionole/Desktop/MyHyperledger/chaincode/asset_example/node';
    request.chaincodeId = "asset_example";
    request.chaincodeVersion = 'v0';
    request.chaincodeType = "node";
    client.installChaincode(request).then(data => {
      console.log("It installed on these peers I guess, but not sure", data);
    }).catch(err => {
      console.log("couldn't install chaincode on these peers", err);
    })
  });
});


app.post('/instantiate_chaincode', async function (req, res) {
  var peers = [];
  var request = {};
  let proposalResponses, proposal;
  client.initCredentialStores().then(() => {
    var private_key_admin = fs.readFileSync(path.join(__dirname, configObject.adminPrivateKey));
    var certificate_admin = fs.readFileSync(path.join(__dirname, configObject.signedCert));
    client.setAdminSigningIdentity(private_key_admin, certificate_admin, configObject.msp_id);


    let channel = client.getChannel(channel_name);
    let peer = client.getPeer(configObject.peer);
    let txId = client.newTransactionID(true);
    peers.push(peer);
    request.targets = peers;
    request.chaincodeType = "node";
    request.chaincodeId = "asset_example";
    request.chaincodeVersion = 'v0';
    request.fcn = 'init';
    request.args = ['1', '2'];
    request.txId = txId;
    let event_hubs = channel.getChannelEventHubsForOrg();
    console.log('found %s eventhubs for this organization');
    channel.sendInstantiateProposal(request, 60000).then(results => {
      console.log("It returned transaction endorsement response");
      proposalResponses = results[0];
      proposal = results[1];
      let allGood = proposalResponses.every(pr => pr.response && pr.response.status == 200);
      if (!allGood) {
        console.log(proposalResponses);
        console.log("Failed to send Proposal and receive all good ProposalResponse");
      } else {
        const request = {
          proposalResponses,
          proposal
        };
        const deployId = txId.getTransactionID();
        var promises = [];
        
        
        event_hubs.forEach((eh) => {
          let instantiateEventPromise = new Promise((resolve, reject) => {
            console.log('instantiateEventPromise - setting up event');
            let event_timeout = setTimeout(() => {
              let message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
              console.log(message);
              eh.disconnect();
            }, 60000);
            eh.registerTxEvent(deployId, (tx, code, block_num) => {
              console.log('The chaincode instantiate transaction has been committed on peer %s', eh.getPeerAddr());
              console.log('Transaction %s has status of %s in blocl %s', tx, code, block_num);
              clearTimeout(event_timeout);

              if (code !== 'VALID') {
                console.log("The chaincode instantiate transaction was invalid, code:%s',code");
                reject(message);
              } else {
                let message = 'The chaincode instantiate transaction was valid.';
                console.log(message);
                resolve(message);
              }
            }, (err) => {
              clearTimeout(event_timeout);
              
              reject(err);
            },
              { unregister: true, disconnect: true }
            );
            eh.connect();
          });
          promises.push(instantiateEventPromise);
        });


        var orderer_request = {
          txId: txId,
          proposalResponses: proposalResponses,
          proposal: proposal
        };
        var sendPromise = channel.sendTransaction(orderer_request);
        promises.push(sendPromise);

        Promise.all(promises).then(results => {
          console.log('=-----RESPONSE-----', results);
          let response = results.pop(); //  orderer results are last in the results
          if (response.status === 'SUCCESS') {
            console.log('Successfully sent transaction to the orderer.');
          } else {
            console.log('Failed to order the transaction. Error code: %s', response.status);
          }

          // now see what each of the event hubs reported
          for (let i in results) {
            let event_hub_result = results[i];
            let event_hub = event_hubs[i];
            console.log('Event results for event hub :%s', event_hub.getPeerAddr());
            if (typeof event_hub_result === 'string') {
              console.log(event_hub_result);
            } else {
              if (!error_message) error_message = event_hub_result.toString();
              console.log(event_hub_result.toString());
            }
          }
        });
      }
    }).then(result => {
      console.log("All Went fine");
    }).catch(err => {
      console.log("couldn't instantiate chaincode on these peers", err);
    })
  });
});



app.get("/query_chaincode", function(req,res){
  client.initCredentialStores().then(() => {
    client.setUserContext({username:configObject.ca_username, password:configObject.ca_password}).then(admin=>{
      var channel = client.getChannel(channel_name);
      var ShopPeer0 = client.getPeer(configObject.peer)
      const request = {
        targets: [ShopPeer0],
        chaincodeId: 'asset_example',
        fcn: 'get',
        args: ['1']
      };
      
    channel.queryByChaincode(request).then(query_responses => {
        console.log("Query has completed, checking results");
        if (query_responses && query_responses.length == 1) {
          if (query_responses[0] instanceof Error) {
            console.error("error from query = ", query_responses[0]);
          } else {
            console.log("Response is ", query_responses[0].toString());
          }
        } else {
          console.log("No payloads were returned from query");
        }
      }).catch(err => {
        console.log("Error: ", err);
      }) 

    })
  })
  
    
});

app.post("/invoke_chaincode", function(req,res){
  var peers = [];
  var request = {};
  let proposalResponses, proposal;
  client.initCredentialStores().then(() => {
    client.setUserContext({username:configObject.ca_username, password:configObject.ca_password}).then(user=>{
      let channel = client.getChannel(channel_name);
      let peer = client.getPeer(configObject.peer);
      let txId = client.newTransactionID(true);
      peers.push(peer);
      request.targets = peers;
      request.chaincodeType = "node";
      request.chaincodeId = "asset_example";
      request.fcn = 'set';
      request.args = ['1', '9'];
      request.txId = txId;
      let event_hubs = channel.getChannelEventHubsForOrg();
      console.log('found %s eventhubs for this organization');
      channel.sendTransactionProposal(request).then(results => {
        console.log("It returned transaction endorsement response");
        proposalResponses = results[0];
        proposal = results[1];
        let allGood = proposalResponses.every(pr => pr.response && pr.response.status == 200);
        if (!allGood) {
          console.log(proposalResponses);
          console.log("Failed to send Proposal and receive all good ProposalResponse");
        } else {
          const request = {
            proposalResponses,
            proposal
          };
          const deployId = txId.getTransactionID();
          var promises = [];
  
          event_hubs.forEach((eh) => {
            let instantiateEventPromise = new Promise((resolve, reject) => {
              console.log('instantiateEventPromise - setting up event');
              let event_timeout = setTimeout(() => {
                let message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
                console.log(message);
                eh.disconnect();
              }, 60000);
              eh.registerTxEvent(deployId, (tx, code, block_num) => {
                console.log('The chaincode invoke transaction has been committed on peer %s', eh.getPeerAddr());
                console.log('Transaction %s has status of %s in blocl %s', tx, code, block_num);
                clearTimeout(event_timeout);

                if (code !== 'VALID') {
                  console.log("The chaincode invoke transaction was invalid, code:%s',code");
                  reject(message);
                } else {
                  let message = 'The chaincode invoke transaction was valid.';
                  console.log(message);
                  resolve(message);
                }
              }, (err) => {
                clearTimeout(event_timeout);
                console.log(err);
                reject(err);
              },
                { unregister: true, disconnect: true }
              );
              eh.connect();
            });
            promises.push(instantiateEventPromise);
          });


          var orderer_request = {
            proposalResponses: proposalResponses,
            proposal: proposal,
            txId: txId,
          };
          var sendPromise = channel.sendTransaction(orderer_request);
          promises.push(sendPromise);

          Promise.all(promises).then(results => {
            console.log('=-----RESPONSE-----', results);
            let response = results.pop(); //  orderer results are last in the results
            if (response.status === 'SUCCESS') {
              console.log('Successfully sent transaction to the orderer.');
            } else {
              console.log('Failed to order the transaction. Error code: %s', response.status);
            }

            // now see what each of the event hubs reported
            for (let i in results) {
              let event_hub_result = results[i];
              let event_hub = event_hubs[i];
              console.log('Event results for event hub :%s', event_hub.getPeerAddr());
              if (typeof event_hub_result === 'string') {
                console.log(event_hub_result);
              } else {
                if (!error_message) error_message = event_hub_result.toString();
                console.log(event_hub_result.toString());
              }
            }
          });
        }
      }).then(result => {
        console.log("All Went fine");
      }).catch(err => {
        console.log("couldn't invoke chaincode", err);
      })
    });
  });
});










app.listen(4000, () => console.log());













































