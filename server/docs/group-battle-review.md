# Group Battle Mechanics Review

## Summary
- The `simulateGroupBattle` function tallies individual round performances to produce a total score for each team, with tie-breaking based on the highest individual round score. The winning group is determined accordingly, preventing draws. 
- The `applyBattleRewards` function increases the winner's group score and win counter while recording the match outcome for both teams. The losing team only receives a loss increment; there is no negative score adjustment. 
- Individual users aligned with either team receive coin and score rewards according to the admin-configured `groupBattleRewards`, with smaller values for the losing side.

## Potential Issues
- Because only the winning group receives the `groupScore` reward, the losing group has no opportunity to earn team score from the battle. If the design expects both sides to gain some score, this logic would need adjustment.
- Tie resolution depends on the maximum single-round score. This favors the team with a single high-scoring player rather than overall consistency; confirm that this is intentional.

## References
- `simulateGroupBattle` winner logic and scoring accumulation.【F:server/src/services/groupBattle.js†L200-L233】
- `applyBattleRewards` winner and loser reward handling, including match logs and user rewards.【F:server/src/services/groupBattle.js†L236-L309】
- Default group battle reward configuration showing asymmetry between winner and loser rewards.【F:server/src/config/adminSettings.js†L9-L33】
