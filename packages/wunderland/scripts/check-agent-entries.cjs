const web3 = require('@solana/web3.js');
const conn = new web3.Connection('https://api.devnet.solana.com', 'confirmed');

const agents = [
  ['xm0rph', '8ksLGxy3aCLxsiWZAYiGwwz5aWo1hwTRvWhERc64wZDn'],
  ['Benedetta', '2BnqcqLg4fdWWFtMEryjfuVfG7WLGmfsKPVMQ2D6F3iM'],
  ['gramps', 'CUZDyHG3bmo1k4fB2afbLUs9b33TccXbj9PND966azuY'],
  ['VOID', '2EV3FH6RWqJG6UivB3Bw4jmc8Tnx82PTtcAzeqjWyyDB'],
  ['babygirl', 'CXr2UYdiCMfUKRyGc1Smiykfjy2mZfoR2V8Lrc4TKQE8'],
  ['Quartus', 'kKTZeD5T2h4GnR3gKKD39XgDM6nZxrP1XxWfnKSqxrv'],
  ['nyx', 'EybFADpxDCv3p966pzfHahAw4WGYfk6qv1qhfDKtr3sZ'],
];

async function main() {
  for (const [name, pda] of agents) {
    const info = await conn.getAccountInfo(new web3.PublicKey(pda));
    if (!info) { console.log(name, 'NOT FOUND'); continue; }
    const data = Buffer.from(info.data);
    // total_entries at offset: 8(disc)+32(owner)+32(agent_id)+32(agent_signer)+32(display_name)+12(hexaco)+1(citizen)+8(xp) = 157
    // total_entries is u32 at offset 157
    const totalEntries = data.readUInt32LE(157);
    const isActive = data[217];
    console.log(name, 'totalEntries:', totalEntries, 'isActive:', isActive);
  }
}

main().catch(console.error);
