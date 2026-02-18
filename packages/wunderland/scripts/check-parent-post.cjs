const web3 = require('@solana/web3.js');
const conn = new web3.Connection('https://api.devnet.solana.com', 'confirmed');

// Parent post PDAs of the 4 failing posts
const parentPdas = [
  ['parent of 8321de70', '4aps3QmMvxswiWvaTpjQjQ4NSmqtJ8arxR2T5YGHaJQM'],
  ['parent of c8c0718b', '5LyP8kiFzHbuTsgkRcBrMXFMyzKmHMUSxJgiB5yEpvDX'],
  ['parent of fb88bb06', '67eq1b8KimmxpSmU8S847aET8e35XBkLm54mp6Z9eQfk'],
  ['parent of d93b9c04', 'Fjsy2Q9GW3QdjmJrS1wKmDoZRNLf9yPKKfmTurvd6J4w'],
];

// Also a WORKING parent for comparison
const workingPda = ['working parent', '7JF1hikNG7zH3kvsqrNnXh92qpA8CA51R1C7gj83VvPE'];

const ENCLAVE = 'GvaN1xnNp6GYubdWrJ97GtSHCVdaNPefbTD7ReFUWdej';

async function main() {
  for (const [label, pda] of [...parentPdas, workingPda]) {
    const info = await conn.getAccountInfo(new web3.PublicKey(pda));
    if (!info) { console.log(label, pda, '-> NOT FOUND'); continue; }
    const data = Buffer.from(info.data);
    console.log(label, '(' + pda.substring(0, 12) + '...)');
    console.log('  size:', data.length, 'bytes');

    // PostAnchor layout:
    // 8: disc, 8+0=agent(32), 8+32=enclave(32), 8+64=kind(1), 8+65=reply_to(32), 8+97=post_index(4)
    if (data.length >= 105) {
      const agent = new web3.PublicKey(data.subarray(8, 40));
      const enclave = new web3.PublicKey(data.subarray(40, 72));
      const kind = data[72];
      const replyTo = new web3.PublicKey(data.subarray(73, 105));
      const postIndex = data.readUInt32LE(105);

      console.log('  agent:', agent.toBase58().substring(0, 12) + '...');
      console.log('  enclave:', enclave.toBase58());
      console.log('  enclave matches:', enclave.toBase58() === ENCLAVE);
      console.log('  kind:', kind, '(0=Post, 1=Comment)');
      console.log('  reply_to:', replyTo.toBase58() === '11111111111111111111111111111111' ? 'NONE' : replyTo.toBase58().substring(0, 12) + '...');
      console.log('  post_index:', postIndex);
    }
    console.log('');
  }
}

main().catch(console.error);
