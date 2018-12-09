
export FABRIC_CFG_PATH=.
rm -rf ../crypto-config
rm -rf ../API/hfc-key-store

./cryptogen generate --config=./crypto-config.yaml --output=../crypto-config/

mv ../crypto-config/ordererOrganizations/orderer-org/ca/*_sk ../crypto-config/ordererOrganizations/orderer-org/ca/ca.orderer-org-priv.pem
mv ../crypto-config/ordererOrganizations/orderer-org/orderers/orderer0/msp/keystore/*_sk ../crypto-config/ordererOrganizations/orderer-org/orderers/orderer0/msp/keystore/orderer0-priv.pem
mv ../crypto-config/ordererOrganizations/orderer-org/users/Admin@orderer-org/msp/keystore/*_sk ../crypto-config/ordererOrganizations/orderer-org/users/Admin@orderer-org/msp/keystore/Admin@orderer-org-priv.pem



mv ../crypto-config/peerOrganizations/insurance-org/ca/*_sk ../crypto-config/peerOrganizations/insurance-org/ca/ca.insurance-org-priv.pem
mv ../crypto-config/peerOrganizations/insurance-org/peers/insurance-peer-0/msp/keystore/*_sk ../crypto-config/peerOrganizations/insurance-org/peers/insurance-peer-0/msp/keystore/insurance-peer-0-priv.pem
mv ../crypto-config/peerOrganizations/insurance-org/users/Admin@insurance-org/msp/keystore/*_sk ../crypto-config/peerOrganizations/insurance-org/users/Admin@insurance-org/msp/keystore/Admin@insurance-org-priv.pem


mv ../crypto-config/peerOrganizations/shop-org/ca/*_sk ../crypto-config/peerOrganizations/shop-org/ca/ca.shop-org-priv.pem
mv ../crypto-config/peerOrganizations/shop-org/peers/shop-peer-0/msp/keystore/*_sk ../crypto-config/peerOrganizations/shop-org/peers/shop-peer-0/msp/keystore/shop-peer-0-priv.pem
mv ../crypto-config/peerOrganizations/shop-org/users/Admin@shop-org/msp/keystore/*_sk ../crypto-config/peerOrganizations/shop-org/users/Admin@shop-org/msp/keystore/Admin@shop-org-priv.pem


./configtxgen -profile OrdererGenesis -outputBlock ../crypto-config/genesis.block
./configtxgen -outputCreateChannelTx ../crypto-config/channel.tx  -profile ShopInsuranceChannel -channelID globalchannel
