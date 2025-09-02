# 📚 EduNFT: Blockchain-Powered Educational Content Ownership

Welcome to EduNFT, a revolutionary Web3 platform that empowers educators and content creators to own, monetize, and track the impact of their educational materials using NFTs on the Stacks blockchain. By leveraging blockchain technology, creators can protect their intellectual property, earn royalties from usage, and gain insights into how their content is making a real-world difference—solving the problem of under-compensated educators and lack of transparent impact metrics in the global education sector.

## ✨ Features

🔑 NFT-based ownership: Mint unique NFTs representing educational content like courses, videos, or textbooks.  
💰 Monetization options: Sell, license, or earn royalties automatically through smart contracts.  
📊 Usage tracking: Log student interactions (e.g., views, completions) on-chain for verifiable analytics.  
📈 Impact assessment: Generate reports on content reach, engagement, and educational outcomes.  
🤝 Licensing system: Allow flexible access models like one-time purchases or subscriptions.  
🔒 Authenticity verification: Ensure content integrity with hashes and creator signatures.  
🏆 Royalty distribution: Automatic payouts to creators based on usage milestones.  
🗳️ Governance: Community voting for platform improvements using a DAO structure.

## 🛠 How It Works

EduNFT uses 8 interconnected smart contracts written in Clarity on the Stacks blockchain to create a seamless ecosystem. Here's a high-level overview:

### Core Smart Contracts
1. **NFTMintContract**: Handles minting of NFTs for educational content, storing metadata like title, description, and content hash.  
2. **MarketplaceContract**: Enables buying, selling, and auctioning of NFTs, with built-in royalty splits.  
3. **LicensingContract**: Manages access rights, allowing creators to set licensing terms (e.g., perpetual, time-limited, or usage-based).  
4. **UsageTrackerContract**: Logs on-chain events for content interactions, such as views or quiz completions, submitted via oracle integrations.  
5. **ImpactAssessorContract**: Analyzes usage data to compute metrics like total reach, completion rates, and impact scores.  
6. **RoyaltyDistributorContract**: Automatically distributes royalties to creators based on predefined rules and usage triggers.  
7. **VerificationContract**: Validates content authenticity by checking hashes and creator ownership proofs.  
8. **GovernanceContract**: A DAO for token holders to propose and vote on platform upgrades, ensuring decentralized evolution.

**For Creators**  
- Upload your educational content and generate a unique hash.  
- Mint an NFT via NFTMintContract, including details like course title and learning objectives.  
- Set monetization preferences in LicensingContract (e.g., 10% royalty per access).  
- Track impact through ImpactAssessorContract to see how your materials are being used worldwide.

**For Learners/Consumers**  
- Browse and purchase NFTs on the MarketplaceContract.  
- Access licensed content and log interactions via UsageTrackerContract (e.g., mark a module as completed).  
- Verify content legitimacy using VerificationContract before engaging.

**For Platform Admins/Community**  
- Use GovernanceContract to vote on features like new royalty models.  
- Royalties are auto-distributed by RoyaltyDistributorContract, ensuring fair payouts.

This setup addresses real-world issues like content piracy, unfair compensation, and opaque educational impact by providing immutable ownership, transparent tracking, and automated economics—all powered by Clarity's secure and predictable smart contracts on Stacks. Get started by deploying these contracts and building a frontend dApp!