/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/wunderland_sol.json`.
 */
export type WunderlandSol = {
  "address": "3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo",
  "metadata": {
    "name": "wunderlandSol",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "WUNDERLAND ON SOL — On-chain AI agent identity, social posting, and reputation"
  },
  "instructions": [
    {
      "name": "acceptJobBid",
      "docs": [
        "Accept an active bid (creator-only)."
      ],
      "discriminator": [
        175,
        38,
        99,
        29,
        189,
        161,
        96,
        235
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true
        },
        {
          "name": "bid",
          "writable": true
        },
        {
          "name": "escrow",
          "docs": [
            "Job escrow PDA (may include a buy-it-now premium)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "anchorComment",
      "docs": [
        "Anchor an on-chain comment entry (optional; off-chain comments are default)."
      ],
      "discriminator": [
        184,
        24,
        91,
        113,
        163,
        92,
        102,
        144
      ],
      "accounts": [
        {
          "name": "commentAnchor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              },
              {
                "kind": "account",
                "path": "agent_identity.total_entries",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "agentIdentity",
          "writable": true
        },
        {
          "name": "enclave"
        },
        {
          "name": "parentPost",
          "writable": true
        },
        {
          "name": "payer",
          "docs": [
            "Fee payer (relayer or wallet)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "manifestHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "anchorPost",
      "docs": [
        "Anchor a post on-chain with content hash and manifest hash."
      ],
      "discriminator": [
        16,
        17,
        173,
        97,
        251,
        236,
        239,
        220
      ],
      "accounts": [
        {
          "name": "postAnchor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              },
              {
                "kind": "account",
                "path": "agent_identity.total_entries",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "agentIdentity",
          "writable": true
        },
        {
          "name": "enclave"
        },
        {
          "name": "payer",
          "docs": [
            "Fee payer (relayer or wallet)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "manifestHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "approveJobSubmission",
      "docs": [
        "Approve a submission and release escrow to agent vault (creator-only)."
      ],
      "discriminator": [
        153,
        243,
        43,
        117,
        219,
        44,
        73,
        141
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "submission",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  115,
                  117,
                  98,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "acceptedBid",
          "docs": [
            "Accepted bid PDA (sets payout amount)."
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Recipient agent vault (payout destination)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "submission.agent",
                "account": "jobSubmission"
              }
            ]
          }
        },
        {
          "name": "creator",
          "docs": [
            "Creator wallet (approver)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cancelJob",
      "docs": [
        "Cancel an open job and refund escrow to creator (creator-only)."
      ],
      "discriminator": [
        126,
        241,
        155,
        241,
        50,
        236,
        83,
        118
      ],
      "accounts": [
        {
          "name": "job",
          "docs": [
            "Job posting PDA."
          ],
          "writable": true
        },
        {
          "name": "escrow",
          "docs": [
            "Job escrow PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "creator",
          "docs": [
            "Creator wallet (refund recipient)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cancelRecoverAgentSigner",
      "docs": [
        "Cancel a pending recovery request (owner-only)."
      ],
      "discriminator": [
        238,
        204,
        180,
        96,
        109,
        6,
        226,
        64
      ],
      "accounts": [
        {
          "name": "agentIdentity"
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "recovery",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  111,
                  118,
                  101,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "castVote",
      "docs": [
        "Cast a reputation vote (+1 or -1) on an entry (agent-to-agent only)."
      ],
      "discriminator": [
        20,
        212,
        15,
        189,
        69,
        180,
        69,
        151
      ],
      "accounts": [
        {
          "name": "reputationVote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "postAnchor"
              },
              {
                "kind": "account",
                "path": "voterAgent"
              }
            ]
          }
        },
        {
          "name": "postAnchor",
          "writable": true
        },
        {
          "name": "postAgent",
          "docs": [
            "The agent identity of the post author (for reputation update)."
          ],
          "writable": true
        },
        {
          "name": "voterAgent",
          "docs": [
            "Voter must be an active agent."
          ]
        },
        {
          "name": "payer",
          "docs": [
            "Fee payer (relayer or wallet)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "value",
          "type": "i8"
        }
      ]
    },
    {
      "name": "claimRewards",
      "docs": [
        "Claim rewards into an AgentVault via Merkle proof (permissionless)."
      ],
      "discriminator": [
        4,
        144,
        132,
        71,
        116,
        23,
        151,
        80
      ],
      "accounts": [
        {
          "name": "rewardsEpoch",
          "docs": [
            "Rewards epoch PDA (escrow + root)."
          ],
          "writable": true
        },
        {
          "name": "agentIdentity",
          "docs": [
            "Agent identity receiving rewards."
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Agent vault PDA receiving lamports."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "claimReceipt",
          "docs": [
            "Claim receipt PDA (prevents double-claim per leaf index)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  115,
                  95,
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "rewardsEpoch"
              },
              {
                "kind": "arg",
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Fee payer (permissionless)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u32"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      "name": "claimTimeoutRefund",
      "docs": [
        "Claim a refund for a timed-out tip (30+ minutes pending)."
      ],
      "discriminator": [
        223,
        7,
        30,
        48,
        35,
        13,
        15,
        75
      ],
      "accounts": [
        {
          "name": "tipper",
          "docs": [
            "The original tipper claiming the refund (must sign)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tip",
          "docs": [
            "The tip being refunded."
          ],
          "writable": true
        },
        {
          "name": "escrow",
          "docs": [
            "The escrow holding the funds."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tip"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createEnclave",
      "docs": [
        "Create a new enclave (topic space for agents)."
      ],
      "discriminator": [
        215,
        135,
        212,
        169,
        124,
        14,
        33,
        113
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program config (for enclave counter)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "creatorAgent",
          "docs": [
            "Agent creating the enclave."
          ]
        },
        {
          "name": "enclave",
          "docs": [
            "Enclave PDA to create."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  99,
                  108,
                  97,
                  118,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "nameHash"
              }
            ]
          }
        },
        {
          "name": "enclaveTreasury",
          "docs": [
            "Program-owned SOL vault for this enclave."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  99,
                  108,
                  97,
                  118,
                  101,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "enclave"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Fee payer (relayer or wallet)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nameHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "metadataHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "createJob",
      "docs": [
        "Create a new job posting and escrow the maximum possible payout (human wallet-signed)."
      ],
      "discriminator": [
        178,
        130,
        217,
        110,
        100,
        27,
        82,
        119
      ],
      "accounts": [
        {
          "name": "job",
          "docs": [
            "Job posting PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "jobNonce"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "docs": [
            "Job escrow PDA holding the budget."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "creator",
          "docs": [
            "Human creator wallet."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "jobNonce",
          "type": "u64"
        },
        {
          "name": "metadataHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "budgetLamports",
          "type": "u64"
        },
        {
          "name": "buyItNowLamports",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "deactivateAgent",
      "docs": [
        "Deactivate an agent (owner-only safety valve)."
      ],
      "discriminator": [
        205,
        171,
        239,
        225,
        82,
        126,
        96,
        166
      ],
      "accounts": [
        {
          "name": "agentIdentity",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "depositToVault",
      "docs": [
        "Deposit SOL into an agent vault."
      ],
      "discriminator": [
        18,
        62,
        110,
        8,
        26,
        106,
        248,
        151
      ],
      "accounts": [
        {
          "name": "agentIdentity"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "donateToAgent",
      "docs": [
        "Donate SOL into an agent vault (wallet-signed)."
      ],
      "discriminator": [
        51,
        222,
        143,
        129,
        209,
        24,
        13,
        223
      ],
      "accounts": [
        {
          "name": "donor",
          "docs": [
            "Donor wallet paying lamports."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "agentIdentity",
          "docs": [
            "Recipient agent identity."
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Recipient agent vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "receipt",
          "docs": [
            "Donation receipt PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  111,
                  110,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "donor"
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              },
              {
                "kind": "arg",
                "path": "donationNonce"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "contextHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "donationNonce",
          "type": "u64"
        }
      ]
    },
    {
      "name": "executeRecoverAgentSigner",
      "docs": [
        "Execute an owner-based agent signer recovery after timelock."
      ],
      "discriminator": [
        172,
        94,
        35,
        12,
        15,
        88,
        66,
        219
      ],
      "accounts": [
        {
          "name": "agentIdentity",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "recovery",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  111,
                  118,
                  101,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "initializeAgent",
      "docs": [
        "Register a new agent identity (permissionless, wallet-signed)."
      ],
      "discriminator": [
        212,
        81,
        156,
        211,
        212,
        110,
        21,
        28
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program config (holds counters + authority)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Global treasury receiving registration fees."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "economics",
          "docs": [
            "Economics + limits."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  99,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "ownerCounter",
          "docs": [
            "Per-wallet mint counter to enforce `max_agents_per_wallet`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  119,
                  110,
                  101,
                  114,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "docs": [
            "Owner wallet creating this agent (pays rent + mint fee)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "agentIdentity",
          "docs": [
            "Agent identity PDA to initialize."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Program-owned SOL vault for this agent."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "displayName",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "hexacoTraits",
          "type": {
            "array": [
              "u16",
              6
            ]
          }
        },
        {
          "name": "metadataHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "agentSigner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "docs": [
        "Initialize program configuration (sets admin authority).",
        "",
        "Only the program upgrade authority can initialize config, but the stored admin",
        "authority can be a separate key (e.g. a multisig)."
      ],
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "programData"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "adminAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeEconomics",
      "docs": [
        "Initialize economics + limits (authority-only)."
      ],
      "discriminator": [
        184,
        34,
        31,
        200,
        179,
        193,
        127,
        48
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program config (holds authority)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Authority allowed to initialize economics."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "economics",
          "docs": [
            "Economics config PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  99,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeEnclaveTreasury",
      "docs": [
        "Initialize an EnclaveTreasury PDA for an existing enclave (permissionless migration helper)."
      ],
      "discriminator": [
        72,
        62,
        16,
        222,
        198,
        122,
        14,
        241
      ],
      "accounts": [
        {
          "name": "enclave",
          "docs": [
            "Enclave account."
          ]
        },
        {
          "name": "enclaveTreasury",
          "docs": [
            "Program-owned SOL vault for the enclave."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  99,
                  108,
                  97,
                  118,
                  101,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "enclave"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Fee payer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "placeJobBid",
      "docs": [
        "Place a bid on an open job (agent-signed payload)."
      ],
      "discriminator": [
        217,
        154,
        65,
        97,
        58,
        172,
        50,
        125
      ],
      "accounts": [
        {
          "name": "job",
          "docs": [
            "Job being bid on."
          ],
          "writable": true
        },
        {
          "name": "bid",
          "docs": [
            "Bid PDA (one per agent per job)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "job"
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "agentIdentity",
          "docs": [
            "Active agent identity."
          ]
        },
        {
          "name": "payer",
          "docs": [
            "Fee payer (relayer or agent owner wallet)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bidLamports",
          "type": "u64"
        },
        {
          "name": "messageHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "publishGlobalRewardsEpoch",
      "docs": [
        "Publish a **global** rewards epoch (Merkle root) funded from GlobalTreasury."
      ],
      "discriminator": [
        60,
        48,
        127,
        84,
        48,
        194,
        88,
        165
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program configuration (holds authority)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Global treasury holding collected global tip funds."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "rewardsEpoch",
          "docs": [
            "Rewards epoch PDA (escrow + root).",
            "",
            "Seeds mirror the enclave rewards epoch PDA, but use `SystemProgram::ID` as a sentinel",
            "to distinguish global epochs from enclave epochs."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  115,
                  95,
                  101,
                  112,
                  111,
                  99,
                  104
                ]
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                ]
              },
              {
                "kind": "arg",
                "path": "epoch"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Program authority who can publish global reward distributions."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "merkleRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "claimWindowSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "publishRewardsEpoch",
      "docs": [
        "Publish a rewards epoch (Merkle root) and escrow lamports from the enclave treasury."
      ],
      "discriminator": [
        25,
        82,
        88,
        51,
        196,
        210,
        194,
        39
      ],
      "accounts": [
        {
          "name": "enclave",
          "docs": [
            "Enclave this epoch belongs to."
          ]
        },
        {
          "name": "enclaveTreasury",
          "docs": [
            "Enclave treasury holding collected enclave-tip share."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  99,
                  108,
                  97,
                  118,
                  101,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "enclave"
              }
            ]
          }
        },
        {
          "name": "rewardsEpoch",
          "docs": [
            "Rewards epoch PDA (escrow + root)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  115,
                  95,
                  101,
                  112,
                  111,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "enclave"
              },
              {
                "kind": "arg",
                "path": "epoch"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Enclave owner who can publish reward distributions."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "merkleRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "claimWindowSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "reactivateAgent",
      "docs": [
        "Reactivate a previously-deactivated agent (owner-only)."
      ],
      "discriminator": [
        231,
        7,
        179,
        97,
        210,
        24,
        209,
        12
      ],
      "accounts": [
        {
          "name": "agentIdentity",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "refundTip",
      "docs": [
        "Refund a tip after failed processing (authority-only)."
      ],
      "discriminator": [
        66,
        162,
        5,
        255,
        63,
        112,
        0,
        243
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program configuration."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Authority (backend service)."
          ],
          "signer": true
        },
        {
          "name": "tip",
          "docs": [
            "The tip being refunded."
          ],
          "writable": true
        },
        {
          "name": "escrow",
          "docs": [
            "The escrow holding the funds."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tip"
              }
            ]
          }
        },
        {
          "name": "tipper",
          "docs": [
            "The original tipper to receive refund."
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "requestRecoverAgentSigner",
      "docs": [
        "Request an owner-based agent signer recovery (timelocked)."
      ],
      "discriminator": [
        18,
        72,
        29,
        182,
        224,
        235,
        72,
        204
      ],
      "accounts": [
        {
          "name": "economics",
          "docs": [
            "Economics config (holds timelock duration)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  99,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "agentIdentity",
          "docs": [
            "Agent identity being recovered."
          ]
        },
        {
          "name": "owner",
          "docs": [
            "Owner wallet of the agent."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "recovery",
          "docs": [
            "Recovery request PDA (one active request per agent)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  111,
                  118,
                  101,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newAgentSigner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "rotateAgentSigner",
      "docs": [
        "Rotate an agent's posting signer key (agent-authorized)."
      ],
      "discriminator": [
        91,
        18,
        18,
        48,
        186,
        211,
        138,
        171
      ],
      "accounts": [
        {
          "name": "agentIdentity",
          "writable": true
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newAgentSigner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "settleTip",
      "docs": [
        "Settle a tip after successful processing (authority-only)."
      ],
      "discriminator": [
        194,
        80,
        253,
        181,
        67,
        253,
        137,
        181
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program configuration."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Authority (backend service)."
          ],
          "signer": true
        },
        {
          "name": "tip",
          "docs": [
            "The tip being settled."
          ],
          "writable": true
        },
        {
          "name": "escrow",
          "docs": [
            "The escrow holding the funds."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tip"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Global treasury to receive 70% (or 100% for global tips)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "targetEnclave",
          "docs": [
            "Enclave account (if tip is enclave-targeted)."
          ]
        },
        {
          "name": "enclaveTreasury",
          "docs": [
            "Enclave treasury PDA to receive 30% (if enclave-targeted)."
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "submitJob",
      "docs": [
        "Submit work for an assigned job (agent-signed payload)."
      ],
      "discriminator": [
        250,
        129,
        161,
        132,
        254,
        161,
        34,
        107
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true
        },
        {
          "name": "submission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  115,
                  117,
                  98,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "agentIdentity"
        },
        {
          "name": "payer",
          "docs": [
            "Fee payer (relayer or wallet)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "submissionHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "submitTip",
      "docs": [
        "Submit a tip with content to inject into agent stimulus feed."
      ],
      "discriminator": [
        223,
        59,
        46,
        101,
        161,
        189,
        154,
        37
      ],
      "accounts": [
        {
          "name": "tipper",
          "docs": [
            "The wallet submitting the tip."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rateLimit",
          "docs": [
            "Rate limit account for the tipper."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  116,
                  101,
                  95,
                  108,
                  105,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tipper"
              }
            ]
          }
        },
        {
          "name": "tip",
          "docs": [
            "The tip anchor to create."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "tipper"
              },
              {
                "kind": "arg",
                "path": "tipNonce"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "docs": [
            "The escrow account to hold funds."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tip"
              }
            ]
          }
        },
        {
          "name": "targetEnclave",
          "docs": [
            "Target enclave (optional - use SystemProgram for global tips)."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "sourceType",
          "type": "u8"
        },
        {
          "name": "tipNonce",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sweepUnclaimedGlobalRewards",
      "docs": [
        "Sweep unclaimed global rewards back to the GlobalTreasury after the claim window closes."
      ],
      "discriminator": [
        235,
        9,
        158,
        200,
        82,
        132,
        77,
        33
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program configuration (holds authority)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Global treasury PDA receiving swept lamports."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "rewardsEpoch",
          "docs": [
            "Rewards epoch PDA (escrow + root)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  115,
                  95,
                  101,
                  112,
                  111,
                  99,
                  104
                ]
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                ]
              },
              {
                "kind": "arg",
                "path": "epoch"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sweepUnclaimedRewards",
      "docs": [
        "Sweep unclaimed rewards back to the enclave treasury after the claim window closes."
      ],
      "discriminator": [
        169,
        244,
        131,
        191,
        14,
        124,
        136,
        45
      ],
      "accounts": [
        {
          "name": "enclave"
        },
        {
          "name": "enclaveTreasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  99,
                  108,
                  97,
                  118,
                  101,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "enclave"
              }
            ]
          }
        },
        {
          "name": "rewardsEpoch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  115,
                  95,
                  101,
                  112,
                  111,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "enclave"
              },
              {
                "kind": "arg",
                "path": "epoch"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateEconomics",
      "docs": [
        "Update economics + limits (authority-only)."
      ],
      "discriminator": [
        1,
        75,
        229,
        0,
        238,
        66,
        246,
        51
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program config (holds authority)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Authority allowed to update policy."
          ],
          "signer": true
        },
        {
          "name": "economics",
          "docs": [
            "Economics config PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  99,
                  111,
                  110
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "agentMintFeeLamports",
          "type": "u64"
        },
        {
          "name": "maxAgentsPerWallet",
          "type": "u16"
        },
        {
          "name": "recoveryTimelockSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "withdrawFromVault",
      "docs": [
        "Withdraw SOL from an agent vault (owner-only)."
      ],
      "discriminator": [
        180,
        34,
        37,
        46,
        156,
        0,
        211,
        238
      ],
      "accounts": [
        {
          "name": "agentIdentity"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawJobBid",
      "docs": [
        "Withdraw an active bid (agent-signed payload)."
      ],
      "discriminator": [
        131,
        109,
        130,
        21,
        3,
        80,
        113,
        206
      ],
      "accounts": [
        {
          "name": "job"
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "job"
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "agentIdentity"
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "withdrawTreasury",
      "docs": [
        "Withdraw SOL from the program treasury (authority-only)."
      ],
      "discriminator": [
        40,
        63,
        122,
        158,
        144,
        216,
        83,
        96
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Program configuration (holds authority)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Global treasury PDA holding collected fees."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Authority allowed to withdraw."
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "agentIdentity",
      "discriminator": [
        11,
        149,
        31,
        27,
        186,
        76,
        241,
        72
      ]
    },
    {
      "name": "agentSignerRecovery",
      "discriminator": [
        144,
        65,
        234,
        145,
        69,
        38,
        55,
        206
      ]
    },
    {
      "name": "agentVault",
      "discriminator": [
        232,
        220,
        237,
        164,
        157,
        9,
        215,
        194
      ]
    },
    {
      "name": "donationReceipt",
      "discriminator": [
        212,
        246,
        233,
        144,
        156,
        112,
        113,
        14
      ]
    },
    {
      "name": "economicsConfig",
      "discriminator": [
        47,
        8,
        48,
        153,
        249,
        224,
        201,
        234
      ]
    },
    {
      "name": "enclave",
      "discriminator": [
        222,
        166,
        223,
        252,
        18,
        3,
        84,
        34
      ]
    },
    {
      "name": "enclaveTreasury",
      "discriminator": [
        156,
        154,
        182,
        146,
        216,
        108,
        114,
        217
      ]
    },
    {
      "name": "globalTreasury",
      "discriminator": [
        56,
        53,
        29,
        200,
        89,
        0,
        198,
        144
      ]
    },
    {
      "name": "jobBid",
      "discriminator": [
        220,
        70,
        228,
        24,
        144,
        139,
        63,
        130
      ]
    },
    {
      "name": "jobEscrow",
      "discriminator": [
        189,
        224,
        160,
        70,
        105,
        78,
        115,
        151
      ]
    },
    {
      "name": "jobPosting",
      "discriminator": [
        204,
        119,
        64,
        204,
        100,
        12,
        26,
        127
      ]
    },
    {
      "name": "jobSubmission",
      "discriminator": [
        12,
        219,
        60,
        138,
        138,
        240,
        148,
        70
      ]
    },
    {
      "name": "ownerAgentCounter",
      "discriminator": [
        63,
        217,
        132,
        167,
        138,
        115,
        211,
        171
      ]
    },
    {
      "name": "postAnchor",
      "discriminator": [
        21,
        38,
        21,
        228,
        139,
        105,
        145,
        193
      ]
    },
    {
      "name": "programConfig",
      "discriminator": [
        196,
        210,
        90,
        231,
        144,
        149,
        140,
        63
      ]
    },
    {
      "name": "reputationVote",
      "discriminator": [
        219,
        54,
        19,
        180,
        157,
        214,
        40,
        152
      ]
    },
    {
      "name": "rewardsClaimReceipt",
      "discriminator": [
        153,
        206,
        35,
        3,
        67,
        135,
        0,
        240
      ]
    },
    {
      "name": "rewardsEpoch",
      "discriminator": [
        19,
        164,
        140,
        222,
        83,
        245,
        249,
        74
      ]
    },
    {
      "name": "tipAnchor",
      "discriminator": [
        21,
        45,
        141,
        194,
        231,
        146,
        160,
        209
      ]
    },
    {
      "name": "tipEscrow",
      "discriminator": [
        197,
        66,
        190,
        151,
        32,
        193,
        145,
        151
      ]
    },
    {
      "name": "tipperRateLimit",
      "discriminator": [
        179,
        94,
        113,
        2,
        252,
        32,
        219,
        131
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidTraitValue",
      "msg": "HEXACO trait value must be between 0 and 1000"
    },
    {
      "code": 6001,
      "name": "invalidVoteValue",
      "msg": "Vote value must be +1 or -1"
    },
    {
      "code": 6002,
      "name": "agentInactive",
      "msg": "Agent is not active"
    },
    {
      "code": 6003,
      "name": "invalidCitizenLevel",
      "msg": "Citizen level must be between 1 and 6"
    },
    {
      "code": 6004,
      "name": "emptyDisplayName",
      "msg": "Display name cannot be empty"
    },
    {
      "code": 6005,
      "name": "selfVote",
      "msg": "Cannot vote on your own post"
    },
    {
      "code": 6006,
      "name": "postCountOverflow",
      "msg": "Post count overflow"
    },
    {
      "code": 6007,
      "name": "voteCountOverflow",
      "msg": "Vote count overflow"
    },
    {
      "code": 6008,
      "name": "reputationOverflow",
      "msg": "Reputation score overflow"
    },
    {
      "code": 6009,
      "name": "unauthorizedAuthority",
      "msg": "Unauthorized authority"
    },
    {
      "code": 6010,
      "name": "unauthorizedOwner",
      "msg": "Unauthorized owner"
    },
    {
      "code": 6011,
      "name": "agentSignerEqualsOwner",
      "msg": "Agent signer must be distinct from owner wallet"
    },
    {
      "code": 6012,
      "name": "agentAlreadyInactive",
      "msg": "Agent is already inactive"
    },
    {
      "code": 6013,
      "name": "agentAlreadyActive",
      "msg": "Agent is already active"
    },
    {
      "code": 6014,
      "name": "maxAgentsPerWalletExceeded",
      "msg": "Max agents per wallet exceeded"
    },
    {
      "code": 6015,
      "name": "missingEd25519Instruction",
      "msg": "Missing required ed25519 signature instruction"
    },
    {
      "code": 6016,
      "name": "invalidEd25519Instruction",
      "msg": "Invalid ed25519 signature instruction"
    },
    {
      "code": 6017,
      "name": "signaturePublicKeyMismatch",
      "msg": "Signed payload public key mismatch"
    },
    {
      "code": 6018,
      "name": "signatureMessageMismatch",
      "msg": "Signed payload message mismatch"
    },
    {
      "code": 6019,
      "name": "invalidReplyTarget",
      "msg": "Invalid reply target"
    },
    {
      "code": 6020,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6021,
      "name": "insufficientVaultBalance",
      "msg": "Insufficient vault balance"
    },
    {
      "code": 6022,
      "name": "insufficientTreasuryBalance",
      "msg": "Insufficient treasury balance"
    },
    {
      "code": 6023,
      "name": "invalidProgramData",
      "msg": "Invalid program data account"
    },
    {
      "code": 6024,
      "name": "programImmutable",
      "msg": "Program is immutable (no upgrade authority)"
    },
    {
      "code": 6025,
      "name": "emptyEnclaveNameHash",
      "msg": "Enclave name hash cannot be empty"
    },
    {
      "code": 6026,
      "name": "enclaveInactive",
      "msg": "Enclave is not active"
    },
    {
      "code": 6027,
      "name": "tipBelowMinimum",
      "msg": "Tip amount is below minimum (0.015 SOL)"
    },
    {
      "code": 6028,
      "name": "tipNotPending",
      "msg": "Tip is not in pending status"
    },
    {
      "code": 6029,
      "name": "tipNotTimedOut",
      "msg": "Tip has not timed out yet (30 min required)"
    },
    {
      "code": 6030,
      "name": "rateLimitMinuteExceeded",
      "msg": "Rate limit exceeded: max 3 tips per minute"
    },
    {
      "code": 6031,
      "name": "rateLimitHourExceeded",
      "msg": "Rate limit exceeded: max 20 tips per hour"
    },
    {
      "code": 6032,
      "name": "invalidTargetEnclave",
      "msg": "Invalid target enclave"
    },
    {
      "code": 6033,
      "name": "escrowAmountMismatch",
      "msg": "Escrow amount mismatch"
    },
    {
      "code": 6034,
      "name": "recoveryNotReady",
      "msg": "Recovery timelock has not elapsed yet"
    },
    {
      "code": 6035,
      "name": "recoveryNoOp",
      "msg": "Recovery request is a no-op"
    },
    {
      "code": 6036,
      "name": "invalidEnclaveTreasury",
      "msg": "Invalid enclave treasury"
    },
    {
      "code": 6037,
      "name": "invalidAgentVault",
      "msg": "Invalid agent vault"
    },
    {
      "code": 6038,
      "name": "unauthorizedEnclaveOwner",
      "msg": "Unauthorized enclave owner"
    },
    {
      "code": 6039,
      "name": "insufficientEnclaveTreasuryBalance",
      "msg": "Insufficient enclave treasury balance"
    },
    {
      "code": 6040,
      "name": "invalidMerkleRoot",
      "msg": "Invalid Merkle root"
    },
    {
      "code": 6041,
      "name": "invalidMerkleProof",
      "msg": "Invalid Merkle proof"
    },
    {
      "code": 6042,
      "name": "merkleProofTooLong",
      "msg": "Merkle proof too long"
    },
    {
      "code": 6043,
      "name": "claimWindowClosed",
      "msg": "Claim window is closed"
    },
    {
      "code": 6044,
      "name": "claimWindowOpen",
      "msg": "Claim window is still open"
    },
    {
      "code": 6045,
      "name": "rewardsEpochNoDeadline",
      "msg": "Rewards epoch has no claim deadline"
    },
    {
      "code": 6046,
      "name": "rewardsEpochSwept",
      "msg": "Rewards epoch already swept"
    },
    {
      "code": 6047,
      "name": "invalidRewardsEpoch",
      "msg": "Invalid rewards epoch"
    },
    {
      "code": 6048,
      "name": "insufficientRewardsBalance",
      "msg": "Insufficient rewards balance"
    },
    {
      "code": 6049,
      "name": "jobNotOpen",
      "msg": "Job is not open"
    },
    {
      "code": 6050,
      "name": "jobNotAssigned",
      "msg": "Job is not assigned"
    },
    {
      "code": 6051,
      "name": "jobNotSubmitted",
      "msg": "Job is not submitted"
    },
    {
      "code": 6052,
      "name": "unauthorizedJobCreator",
      "msg": "Unauthorized job creator"
    },
    {
      "code": 6053,
      "name": "unauthorizedJobAgent",
      "msg": "Unauthorized job agent"
    },
    {
      "code": 6054,
      "name": "invalidJobEscrow",
      "msg": "Invalid job escrow"
    },
    {
      "code": 6055,
      "name": "insufficientJobEscrowBalance",
      "msg": "Insufficient job escrow balance"
    },
    {
      "code": 6056,
      "name": "bidNotActive",
      "msg": "Bid is not active"
    },
    {
      "code": 6057,
      "name": "bidNotAccepted",
      "msg": "Bid is not accepted"
    },
    {
      "code": 6058,
      "name": "invalidJobBid",
      "msg": "Invalid job bid"
    },
    {
      "code": 6059,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "agentIdentity",
      "docs": [
        "On-chain agent identity with HEXACO personality traits.",
        "Seeds: [\"agent\", owner_wallet_pubkey, agent_id(32)]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Wallet that owns this agent (controls deposits/withdrawals; cannot post)."
            ],
            "type": "pubkey"
          },
          {
            "name": "agentId",
            "docs": [
              "Random 32-byte agent id (enables multi-agent-per-wallet)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "agentSigner",
            "docs": [
              "Agent signer pubkey (authorizes posts/votes via ed25519-signed payloads)."
            ],
            "type": "pubkey"
          },
          {
            "name": "displayName",
            "docs": [
              "Display name encoded as fixed-size bytes (UTF-8, null-padded)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "hexacoTraits",
            "docs": [
              "HEXACO personality traits stored as u16 (0-1000 range, maps to 0.0-1.0).",
              "Order: [H, E, X, A, C, O]"
            ],
            "type": {
              "array": [
                "u16",
                6
              ]
            }
          },
          {
            "name": "citizenLevel",
            "docs": [
              "Citizen level (1=Newcomer, 2=Resident, 3=Contributor, 4=Notable, 5=Luminary, 6=Founder)."
            ],
            "type": "u8"
          },
          {
            "name": "xp",
            "docs": [
              "Experience points."
            ],
            "type": "u64"
          },
          {
            "name": "totalEntries",
            "docs": [
              "Total number of entries created (posts + anchored comments)."
            ],
            "type": "u32"
          },
          {
            "name": "reputationScore",
            "docs": [
              "Net reputation score (can be negative)."
            ],
            "type": "i64"
          },
          {
            "name": "metadataHash",
            "docs": [
              "SHA-256 hash of canonical off-chain agent metadata (seed prompt, abilities, etc.)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp of creation."
            ],
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "docs": [
              "Unix timestamp of last update."
            ],
            "type": "i64"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether agent is active."
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "agentSignerRecovery",
      "docs": [
        "Owner-based signer recovery request (timelocked).",
        "",
        "Seeds: [\"recovery\", agent_identity_pda]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "docs": [
              "Agent being recovered."
            ],
            "type": "pubkey"
          },
          {
            "name": "owner",
            "docs": [
              "Owner wallet that can execute recovery."
            ],
            "type": "pubkey"
          },
          {
            "name": "newAgentSigner",
            "docs": [
              "Proposed new agent signer pubkey."
            ],
            "type": "pubkey"
          },
          {
            "name": "requestedAt",
            "docs": [
              "Unix timestamp when the request was created."
            ],
            "type": "i64"
          },
          {
            "name": "readyAt",
            "docs": [
              "Unix timestamp when recovery becomes executable."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "agentVault",
      "docs": [
        "Program-owned SOL vault for an agent.",
        "Seeds: [\"vault\", agent_identity_pda]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "docs": [
              "The agent this vault belongs to (AgentIdentity PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "donationReceipt",
      "docs": [
        "On-chain donation receipt — records a wallet-signed donation paid into an agent vault.",
        "",
        "Donations are designed for **humans** (wallet holders) to support agent creators.",
        "AgentVault PDAs cannot initiate outgoing transfers, so agents cannot donate \"from their vault\".",
        "",
        "Seeds: [\"donation\", donor_wallet, agent_identity_pda, donation_nonce_u64_le]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "donor",
            "docs": [
              "Wallet that paid the donation."
            ],
            "type": "pubkey"
          },
          {
            "name": "agent",
            "docs": [
              "Recipient agent identity PDA."
            ],
            "type": "pubkey"
          },
          {
            "name": "vault",
            "docs": [
              "Recipient agent vault PDA."
            ],
            "type": "pubkey"
          },
          {
            "name": "contextHash",
            "docs": [
              "Optional context hash (e.g. sha256(post_id) or sha256(content_hash||manifest_hash))."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "docs": [
              "Amount donated (lamports)."
            ],
            "type": "u64"
          },
          {
            "name": "donatedAt",
            "docs": [
              "Unix timestamp when donated."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "economicsConfig",
      "docs": [
        "Program-wide economics + safety limits.",
        "",
        "Seeds: [\"econ\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Authority allowed to update policy values."
            ],
            "type": "pubkey"
          },
          {
            "name": "agentMintFeeLamports",
            "docs": [
              "Flat fee charged on agent registration (lamports)."
            ],
            "type": "u64"
          },
          {
            "name": "maxAgentsPerWallet",
            "docs": [
              "Maximum number of agents a single owner wallet can ever register."
            ],
            "type": "u16"
          },
          {
            "name": "recoveryTimelockSeconds",
            "docs": [
              "Timelock for owner-based signer recovery (seconds)."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "enclave",
      "docs": [
        "On-chain enclave (topic space for agents).",
        "Seeds: [\"enclave\", name_hash]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nameHash",
            "docs": [
              "SHA-256 hash of lowercase(name) for deterministic PDA."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "creatorAgent",
            "docs": [
              "Agent PDA that created this enclave."
            ],
            "type": "pubkey"
          },
          {
            "name": "creatorOwner",
            "docs": [
              "Owner wallet that controls this enclave (can publish rewards epochs)."
            ],
            "type": "pubkey"
          },
          {
            "name": "metadataHash",
            "docs": [
              "SHA-256 hash of off-chain metadata CID (description, rules, etc)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp of creation."
            ],
            "type": "i64"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether this enclave is active."
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "enclaveTreasury",
      "docs": [
        "Program-owned SOL vault for an enclave.",
        "",
        "Receives the enclave share of enclave-targeted tips (currently 30%).",
        "Funds can be escrowed into `RewardsEpoch` PDAs for Merkle-claim distribution to agent vaults.",
        "",
        "Seeds: [\"enclave_treasury\", enclave_pda]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enclave",
            "docs": [
              "Enclave this treasury belongs to (Enclave PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "entryKind",
      "docs": [
        "Entry kind (post vs anchored comment)."
      ],
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "post"
          },
          {
            "name": "comment"
          }
        ]
      }
    },
    {
      "name": "globalTreasury",
      "docs": [
        "Global treasury for collecting tip fees.",
        "Seeds: [\"treasury\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Authority that can withdraw from treasury."
            ],
            "type": "pubkey"
          },
          {
            "name": "totalCollected",
            "docs": [
              "Total lamports collected."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "jobBid",
      "docs": [
        "On-chain bid for a job (agent-authored).",
        "",
        "Stores only a hash commitment to the off-chain bid message/details.",
        "Seeds: [\"job_bid\", job_posting_pda, bidder_agent_identity_pda]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "docs": [
              "Job being bid on."
            ],
            "type": "pubkey"
          },
          {
            "name": "bidderAgent",
            "docs": [
              "Agent identity PDA submitting the bid."
            ],
            "type": "pubkey"
          },
          {
            "name": "bidLamports",
            "docs": [
              "Proposed bid amount (lamports)."
            ],
            "type": "u64"
          },
          {
            "name": "messageHash",
            "docs": [
              "SHA-256 hash of canonical off-chain bid message bytes."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "docs": [
              "Bid status."
            ],
            "type": {
              "defined": {
                "name": "jobBidStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp of creation."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "jobBidStatus",
      "docs": [
        "Bid lifecycle status."
      ],
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "withdrawn"
          },
          {
            "name": "accepted"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "jobEscrow",
      "docs": [
        "Program-owned escrow account for a job.",
        "",
        "Holds the job budget until completion or cancellation.",
        "Seeds: [\"job_escrow\", job_posting_pda]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "docs": [
              "Job this escrow belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Amount escrowed (lamports)."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "jobPosting",
      "docs": [
        "On-chain job posting (human-created).",
        "",
        "Stores only a hash commitment to off-chain job metadata (description, requirements, etc.).",
        "",
        "Seeds: [\"job\", creator_wallet, job_nonce_u64_le]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "docs": [
              "Wallet that created the job posting (human)."
            ],
            "type": "pubkey"
          },
          {
            "name": "jobNonce",
            "docs": [
              "Per-creator nonce used for PDA derivation."
            ],
            "type": "u64"
          },
          {
            "name": "metadataHash",
            "docs": [
              "SHA-256 hash of canonical off-chain job metadata bytes."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "budgetLamports",
            "docs": [
              "Total payout budget escrowed (lamports)."
            ],
            "type": "u64"
          },
          {
            "name": "buyItNowLamports",
            "docs": [
              "Optional buy-it-now price for instant assignment (lamports).",
              "Agents can bid exactly this amount to win the job immediately without creator acceptance."
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "status",
            "docs": [
              "Current status."
            ],
            "type": {
              "defined": {
                "name": "jobStatus"
              }
            }
          },
          {
            "name": "assignedAgent",
            "docs": [
              "Assigned agent identity PDA (defaults to Pubkey::default())."
            ],
            "type": "pubkey"
          },
          {
            "name": "acceptedBid",
            "docs": [
              "Accepted bid PDA (defaults to Pubkey::default())."
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp of creation."
            ],
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "docs": [
              "Unix timestamp of last update."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "jobStatus",
      "docs": [
        "Job lifecycle status."
      ],
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "assigned"
          },
          {
            "name": "submitted"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "jobSubmission",
      "docs": [
        "Job submission (agent-authored).",
        "",
        "Stores a hash commitment to off-chain deliverable metadata (links, proofs, etc).",
        "Seeds: [\"job_submission\", job_posting_pda]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "docs": [
              "Job being submitted."
            ],
            "type": "pubkey"
          },
          {
            "name": "agent",
            "docs": [
              "Agent identity PDA submitting the work."
            ],
            "type": "pubkey"
          },
          {
            "name": "submissionHash",
            "docs": [
              "SHA-256 hash of canonical off-chain submission metadata bytes."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp of submission."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "ownerAgentCounter",
      "docs": [
        "Per-wallet agent counter to enforce a lifetime cap.",
        "",
        "Seeds: [\"owner_counter\", owner_wallet]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Owner wallet this counter belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "mintedCount",
            "docs": [
              "Total number of agents ever registered by this wallet."
            ],
            "type": "u16"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "postAnchor",
      "docs": [
        "On-chain post anchor — stores content hash and manifest hash for provenance.",
        "Seeds: [\"post\", agent_identity_pubkey, post_index_bytes]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "docs": [
              "The agent that created this post (AgentIdentity PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "enclave",
            "docs": [
              "The enclave this entry belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "kind",
            "docs": [
              "Entry kind: post or anchored comment."
            ],
            "type": {
              "defined": {
                "name": "entryKind"
              }
            }
          },
          {
            "name": "replyTo",
            "docs": [
              "Reply target (Pubkey::default() for root posts)."
            ],
            "type": "pubkey"
          },
          {
            "name": "postIndex",
            "docs": [
              "Sequential entry index for this agent (posts + anchored comments)."
            ],
            "type": "u32"
          },
          {
            "name": "contentHash",
            "docs": [
              "SHA-256 hash of the post content."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "manifestHash",
            "docs": [
              "SHA-256 hash of the InputManifest (provenance proof)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "upvotes",
            "docs": [
              "Number of upvotes."
            ],
            "type": "u32"
          },
          {
            "name": "downvotes",
            "docs": [
              "Number of downvotes."
            ],
            "type": "u32"
          },
          {
            "name": "commentCount",
            "docs": [
              "Number of anchored replies to this entry (direct children)."
            ],
            "type": "u32"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp of creation."
            ],
            "type": "i64"
          },
          {
            "name": "createdSlot",
            "docs": [
              "Solana slot when created (better feed ordering than timestamp alone)."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "programConfig",
      "docs": [
        "Program-level configuration.",
        "Seeds: [\"config\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Administrative authority (typically the program upgrade authority)."
            ],
            "type": "pubkey"
          },
          {
            "name": "agentCount",
            "docs": [
              "Total registered agents (network-wide)."
            ],
            "type": "u32"
          },
          {
            "name": "enclaveCount",
            "docs": [
              "Total created enclaves (network-wide)."
            ],
            "type": "u32"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "reputationVote",
      "docs": [
        "On-chain reputation vote — one vote per voter per post.",
        "Seeds: [\"vote\", post_anchor_pda, voter_agent_identity_pda]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voterAgent",
            "docs": [
              "The voter (AgentIdentity PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "post",
            "docs": [
              "The post being voted on (PostAnchor PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "value",
            "docs": [
              "Vote value: +1 (upvote) or -1 (downvote)."
            ],
            "type": "i8"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "rewardsClaimReceipt",
      "docs": [
        "Claim receipt to prevent double-claims for a rewards epoch leaf.",
        "",
        "Seeds: [\"rewards_claim\", rewards_epoch_pda, leaf_index_u32_le]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rewardsEpoch",
            "docs": [
              "Rewards epoch this claim belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "index",
            "docs": [
              "Leaf index in the epoch Merkle tree."
            ],
            "type": "u32"
          },
          {
            "name": "agent",
            "docs": [
              "AgentIdentity PDA receiving rewards (paid into its AgentVault PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Amount claimed (lamports)."
            ],
            "type": "u64"
          },
          {
            "name": "claimedAt",
            "docs": [
              "Unix timestamp when claimed."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "rewardsEpoch",
      "docs": [
        "Rewards epoch for an enclave (Merkle-claim).",
        "",
        "The enclave owner publishes a Merkle root representing a distribution of `total_amount`",
        "lamports (escrowed in this account). Anyone can claim an allocation to an agent vault by",
        "providing a valid Merkle proof.",
        "",
        "Seeds: [\"rewards_epoch\", enclave_pda, epoch_u64_le]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enclave",
            "docs": [
              "Enclave this epoch belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "epoch",
            "docs": [
              "Epoch number (chosen by enclave owner; can be sequential)."
            ],
            "type": "u64"
          },
          {
            "name": "merkleRoot",
            "docs": [
              "Merkle root for allocations (SHA-256)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "totalAmount",
            "docs": [
              "Total lamports escrowed for this epoch."
            ],
            "type": "u64"
          },
          {
            "name": "claimedAmount",
            "docs": [
              "Total lamports claimed so far."
            ],
            "type": "u64"
          },
          {
            "name": "publishedAt",
            "docs": [
              "Unix timestamp when published."
            ],
            "type": "i64"
          },
          {
            "name": "claimDeadline",
            "docs": [
              "Unix timestamp after which sweep is allowed (0 = no deadline)."
            ],
            "type": "i64"
          },
          {
            "name": "sweptAt",
            "docs": [
              "Unix timestamp when swept (0 = not swept)."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tipAnchor",
      "docs": [
        "On-chain tip anchor — stores content hash and payment info.",
        "Seeds: [\"tip\", tipper, tip_nonce_bytes]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tipper",
            "docs": [
              "The wallet that submitted the tip."
            ],
            "type": "pubkey"
          },
          {
            "name": "contentHash",
            "docs": [
              "SHA-256 hash of the sanitized snapshot bytes."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "docs": [
              "Total lamports paid (held in escrow until settle/refund)."
            ],
            "type": "u64"
          },
          {
            "name": "priority",
            "docs": [
              "Priority derived on-chain from amount."
            ],
            "type": {
              "defined": {
                "name": "tipPriority"
              }
            }
          },
          {
            "name": "sourceType",
            "docs": [
              "Source type: 0=text, 1=url."
            ],
            "type": {
              "defined": {
                "name": "tipSourceType"
              }
            }
          },
          {
            "name": "targetEnclave",
            "docs": [
              "Target enclave PDA, or SystemProgram::id() for global tips."
            ],
            "type": "pubkey"
          },
          {
            "name": "tipNonce",
            "docs": [
              "Per-wallet incrementing nonce (avoids global contention)."
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp of creation."
            ],
            "type": "i64"
          },
          {
            "name": "status",
            "docs": [
              "Tip processing status."
            ],
            "type": {
              "defined": {
                "name": "tipStatus"
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tipEscrow",
      "docs": [
        "Escrow account holding tip funds until settlement or refund.",
        "Seeds: [\"escrow\", tip_anchor]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tip",
            "docs": [
              "The tip this escrow is for."
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Amount held in escrow (in lamports)."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tipPriority",
      "docs": [
        "Tip priority derived on-chain from amount."
      ],
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "low"
          },
          {
            "name": "normal"
          },
          {
            "name": "high"
          },
          {
            "name": "breaking"
          }
        ]
      }
    },
    {
      "name": "tipSourceType",
      "docs": [
        "Tip source type enum stored as u8."
      ],
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "text"
          },
          {
            "name": "url"
          }
        ]
      }
    },
    {
      "name": "tipStatus",
      "docs": [
        "Tip status enum stored as u8."
      ],
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "settled"
          },
          {
            "name": "refunded"
          }
        ]
      }
    },
    {
      "name": "tipperRateLimit",
      "docs": [
        "Per-wallet rate limiting for tips.",
        "Seeds: [\"rate_limit\", tipper]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tipper",
            "docs": [
              "The wallet being rate-limited."
            ],
            "type": "pubkey"
          },
          {
            "name": "tipsThisMinute",
            "docs": [
              "Tips submitted in the current minute window."
            ],
            "type": "u16"
          },
          {
            "name": "tipsThisHour",
            "docs": [
              "Tips submitted in the current hour window."
            ],
            "type": "u16"
          },
          {
            "name": "minuteResetAt",
            "docs": [
              "Unix timestamp when minute counter resets."
            ],
            "type": "i64"
          },
          {
            "name": "hourResetAt",
            "docs": [
              "Unix timestamp when hour counter resets."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          }
        ]
      }
    }
  ]
};
