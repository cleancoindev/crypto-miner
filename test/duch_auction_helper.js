const FEATURE_ADD = 0x00000001;
const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

// gem smart contract
const GemERC721 = artifacts.require("./GemERC721");
// country smart contract
const CountryERC721 = artifacts.require("./CountryERC721.sol");
// and an auction to list the gems on
const Auction = artifacts.require("./DutchAuction");
// auction helper will help listing the gems
const Helper = artifacts.require("./DutchAuctionHelper");

// prepare country initialization data
// TODO: load from country_data.js
const COUNTRY_DATA = [
	62920, // Russia
	36777, // Canada
	35261, // China
	35084, // United States of America
	31367, // Brazil
	28333, // Australia
	12108, // India
	10241, // Argentina
	10037, // Kazakhstan
	8773, // Algeria
	8639, // Democratic Republic of the Congo
	7978, // Greenland
	7918, // Saudi Arabia
	7236, // Mexico
	7015, // Indonesia
	6857, // Sudan
	6481, // Libya
	6070, // Iran
	5764, // Mongolia
	4734, // Peru
	4729, // Chad
	4667, // Niger
	4592, // Angola
	4567, // Mali
	4493, // South Africa
	4411, // Colombia
	4152, // Ethiopia
	4046, // Bolivia
	3796, // Mauritania
	3689, // Egypt
	3481, // Tanzania
	3403, // Nigeria
	3359, // Venezuela
	3040, // Namibia
	2961, // Pakistan
	2953, // Mozambique
	2875, // Turkey
	2788, // Chile
	2772, // Zambia
	2499, // Myanmar (Burma)
	2488, // France
	2385, // Afghanistan
	2349, // Somalia
	2295, // Central African Republic
	2283, // South Sudan
	2223, // Ukraine
	2211, // Botswana
	2162, // Madagascar
	2138, // Kenya
	1945, // Yemen
	1893, // Thailand
	1859, // Spain
	1798, // Turkmenistan
	1751, // Cameroon
	1705, // Papua New Guinea
	1657, // Sweden
	1648, // Uzbekistan
	1645, // Morocco
	1610, // Iraq
	1498, // Paraguay
	1439, // Zimbabwe
	1392, // Japan
	1315, // Germany
	1260, // Republic of the Congo
	1241, // Finland
	1215, // Malaysia
	1214, // Vietnam
	1194, // Norway
	1188, // Ivory Coast
	1152, // Poland
	1140, // Oman
	1110, // Italy
	1105, // Philippines
	1044, // Ecuador
	1010, // Burkina Faso
	992, // New Zealand
	986, // Gabon
	906, // Guinea
	897, // United Kingdom
	890, // Uganda
	879, // Ghana
	878, // Romania
	872, // Laos
	792, // Guyana
	765, // Belarus
	731, // Kyrgyzstan
	723, // Senegal
	682, // Syria
	667, // Cambodia
	649, // Uruguay
	603, // Tunisia
	601, // Suriname
	544, // Bangladesh
	542, // Nepal
	527, // Tajikistan
	486, // Greece
	477, // Nicaragua
	447, // Eritrea
	444, // North Korea
	436, // Malawi
	415, // Benin
	413, // Honduras
	410, // Liberia
	409, // Bulgaria
	405, // Cuba
	401, // Guatemala
	379, // Iceland
	363, // South Korea
	343, // Hungary
	340, // Jordan
	336, // Portugal
	325, // Serbia
	319, // Azerbaijan
	309, // Austria
	305, // United Arab Emirates
	290, // Czech Republic
	288, // Panama
	268, // Sierra Leone
	263, // Ireland
	257, // Georgia
	242, // Sri Lanka
	240, // Lithuania
	238, // Latvia
	209, // Togo
	208, // Croatia
	188, // Bosnia and Herzegovina
	188, // Costa Rica
	180, // Slovakia
	179, // Dominican Republic
	173, // Bhutan
	167, // Estonia
	159, // Denmark
	157, // Netherlands
	152, // Switzerland
	133, // Guinea-Bissau
	133, // Republic of China (Taiwan, Quemoy, Matsu)
	125, // Moldova
	120, // Belgium
	112, // Lesotho
	110, // Armenia
	106, // Albania
	105, // Solomon Islands
	103, // Equatorial Guinea
	103, // Burundi
	102, // Haiti
	99, // Israel (Including West Bank and Gaza)
	97, // Rwanda
	93, // Macedonia
	85, // Belize
	81, // Djibouti
	77, // El Salvador
	75, // Slovenia
	67, // Fiji
	66, // Kuwait
	64, // Swaziland
	55, // East Timor
	51, // Bahamas
	51, // Montenegro
	45, // Vanuatu
	42, // Qatar
	42, // Gambia
	40, // Jamaica
	38, // Lebanon
	34, // Cyprus
	21, // Brunei
	19, // Trinidad and Tobago
	15, // Cape Verde
	11, // Samoa
	10, // Luxembourg
	8, // Comoros
	5, // Mauritius
	5, // São Tomé and Príncipe
	5, // Dominica
	5, // Tonga
	5, // Kiribati
	5, // Micronesia
	5, // Singapore
	5, // Bahrain
	5, // Saint Lucia
	5, // Seychelles
	5, // Andorra
	5, // Palau
	5, // Antigua and Barbuda
	5, // Barbados
	5, // Saint Vincent and the Grenadines
	5, // Grenada
	5, // Malta
	5, // Maldives
	5, // Saint Kitts and Nevis
	5, // Liechtenstein
];

contract('Dutch Auction Helper', accounts => {
	it("helper: verifying gem collection on auction", async() => {
		const token = await GemERC721.new();
		const auction = await Auction.new();
		const helper = await Helper.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(token.address, true);
		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await token.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// mint 100 tokens
		for(let i = 0; i < 100; i++) {
			await token.mint(
				accounts[i % 2 + 1], // owner
				i + 1, // unique token ID
				1, // plot ID
				0, // depth
				1, // gem number
				1, // color ID
				1, // level ID
				1, // grade type
				1  // grade value
			);
		}

		// account1 has 50 tokens
		const packedOriginal = await token.getPackedCollection(accounts[1]);

		// auxiliary constant "2"
		const two = web3.toBigNumber(2);

		// construct auction parameters
		const t0 = 60 + new Date().getTime() / 1000 | 0;
		const t1 = t0 + 60;
		const p0 = web3.toWei(1, "ether"); // price starts at 1 ether
		const p1 = web3.toWei(1, "finney"); // and drops to 1 finney

		// put them all to an auction
		for(let i = 0; i < packedOriginal.length; i++) {
			const tokenId = packedOriginal[i].dividedToIntegerBy(two.pow(48));
			const data = abiPack(tokenId, t0, t1, p0, p1);

			// account 1 transfers token to an auction automatically activating it
			await token.safeTransferFrom(accounts[1], auction.address, tokenId, data, {from: accounts[1]});
		}

		// all account1 100 tokens are on the auction, use helper to obtain them
		const packedAuction = await helper.getGemCollection(auction.address, token.address, accounts[1]);

		// pack auction data, prices are in Gwei
		const auctionData = pack(t0, t1, p0 / 1000000000, p1 / 1000000000, p0 / 1000000000);

		// append additional auction specific data to original collection
		for(let i = 0; i < packedOriginal.length; i++) {
			packedOriginal[i] = packedOriginal[i].times(two.pow(160)).plus(auctionData);
		}

		// sort both arrays to compare
		packedOriginal.sort();
		packedAuction.sort();

		// compare both arrays
		assert.deepEqual(packedAuction, packedOriginal, "original and auction arrays differ");
	});

	it("helper: verifying country collection on auction", async() => {
		const token = await CountryERC721.new(COUNTRY_DATA);
		const auction = await Auction.new();
		const helper = await Helper.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(token.address, true);
		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await token.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// mint all the tokens (190)
		for(let i = 0; i < COUNTRY_DATA.length; i++) {
			await token.mint(
				accounts[i % 2 + 1], // owner
				i + 1 // token ID
			);
		}

		// account1 has 95 tokens
		const packedOriginal = await token.getPackedCollection(accounts[1]);

		// auxiliary constant "2"
		const two = web3.toBigNumber(2);

		// construct auction parameters
		const t0 = 60 + new Date().getTime() / 1000 | 0;
		const t1 = t0 + 60;
		const p0 = web3.toWei(1, "ether"); // price starts at 1 ether
		const p1 = web3.toWei(1, "finney"); // and drops to 1 finney

		// put them all to an auction
		for(let i = 0; i < packedOriginal.length; i++) {
			const tokenId = packedOriginal[i].dividedToIntegerBy(two.pow(32));
			const data = abiPack(tokenId, t0, t1, p0, p1);

			// account 1 transfers token to an auction automatically activating it
			await token.safeTransferFrom(accounts[1], auction.address, tokenId, data, {from: accounts[1]});
		}

		// all account1 100 tokens are on the auction, use helper to obtain them
		const packedAuction = await helper.getCountryCollection(auction.address, token.address, accounts[1]);

		// pack auction data, prices are in Gwei
		const auctionData = pack(t0, t1, p0 / 1000000000, p1 / 1000000000, p0 / 1000000000);

		// append additional auction specific data to original collection
		for(let i = 0; i < packedOriginal.length; i++) {
			packedOriginal[i] = packedOriginal[i].times(two.pow(160)).plus(auctionData);
		}

		// sort both arrays to compare
		packedOriginal.sort();
		packedAuction.sort();

		// compare both arrays
		assert.deepEqual(packedAuction, packedOriginal, "original and auction arrays differ");
	});
});

// packs tokenId, t0, t1, p0 and p1 into abi-compliant structure
function abiPack(tokenId, t0, t1, p0, p1) {
	const two = web3.toBigNumber(2);
	return toBytes(two.pow(224).times(tokenId)
		.plus(two.pow(192).times(t0))
		.plus(two.pow(160).times(t1))
		.plus(two.pow(80).times(p0))
		.plus(p1));
}

// packs t0, t1, p0, p1 and p into abi-compliant structure
function pack(t0, t1, p0, p1, p) {
	const two = web3.toBigNumber(2);
	return two.pow(128).times(t0)
		.plus(two.pow(96).times(t1))
		.plus(two.pow(64).times(p0))
		.plus(two.pow(32).times(p1))
		.plus(p);
}

// converts BigNumber representing Solidity uint256 into String representing Solidity bytes
function toBytes(uint256) {
	let s = uint256.toString(16);
	const len = s.length;
	// 256 bits must occupy exactly 64 hex digits
	if(len > 64) {
		s = s.substr(0, 64);
	}
	for(let i = 0; i < 64 - len; i++) {
		s = "0" + s;
	}
	return "0x" + s;
}
