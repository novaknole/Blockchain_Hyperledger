export FABRIC_CFG_PATH=$PWD

# Generate the crypto-materials using crypto-gen
rm -rf ../crypto-config
./cryptogen generate --config=./crypto-config.yaml --output=../crypto-config


# Generate the genesis
./configtxgen -profile OrdererGenesis -channelID orderer-system-channel -outputBlock ../crypto-config/genesis.block
./configtxgen -inspectBlock ../crypto-config/genesis.block

# Generate the channel tx
./configtxgen -outputCreateChannelTx ../crypto-config/channel.tx  -profile ShopInsuranceChannel -channelID globalchannel
./configtxgen --inspectChannelCreateTx ../crypto-config/channel.tx