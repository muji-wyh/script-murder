'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

// AI NPC type configuration
const AI_CHARACTER_TYPES = [
  { id: 'logical', name: 'Logical Analytical', description: 'Good at logical reasoning and detail analysis' },
  { id: 'exploratory', name: 'Exploratory Adventurous', description: 'Brave to try new ideas and hypotheses' },
  { id: 'mysterious', name: 'Mysterious Enigmatic', description: 'Speech often carries mysterious overtones' },
  { id: 'suspicious', name: 'Suspicious Cautious', description: 'Maintains a skeptical attitude towards everything' },
  { id: 'emotional', name: 'Emotionally Rich', description: 'Rich and vivid emotional expression' },
  { id: 'calm', name: 'Calm Composed', description: 'Always maintains calm and rationality' }
];

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState('3');
  const [plotRequirement, setPlotRequirement] = useState('');
  const [selectedAITypes, setSelectedAITypes] = useState(new Map()); // Changed to Map to store quantities
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sttOn, setSttOn] = useState(false); // Whether speech-to-text is in progress
  const [sttError, setSttError] = useState('');
  const sttRecognizerRef = useRef(null);
  const sttMediaRecorderRef = useRef(null);
  const sttChunksRef = useRef([]);
  const [readyPlayers, setReadyPlayers] = useState(new Set()); // Ready players
  const [showGameSummary, setShowGameSummary] = useState(false); // Show game summary
  const [gameSummary, setGameSummary] = useState(null); // Game summary data
  const [startingGame, setStartingGame] = useState(false); // Game start loading state
  const [showCollectScript, setShowCollectScript] = useState(false); // Show collect script option
  const [isScriptCollected, setIsScriptCollected] = useState(false); // Whether script is collected
  const [pollingInterval, setPollingInterval] = useState(null); // Polling timer
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true); // Whether to auto-scroll to bottom
  const [userScrolledUp, setUserScrolledUp] = useState(false); // Whether user manually scrolled up
  const [previousChatCount, setPreviousChatCount] = useState(0); // Record previous chat message count
  const [previousRoundCount, setPreviousRoundCount] = useState(0); // Record previous round count
  const [userScrolledUpPlot, setUserScrolledUpPlot] = useState(false); // Whether user scrolled up in plot area
  const [userScrolledUpClues, setUserScrolledUpClues] = useState(false); // Whether user scrolled up in clues area
  const [friendStyles, setFriendStyles] = useState([]); // Available friend styles
  const [selectedFriendStyles, setSelectedFriendStyles] = useState([]); // Selected friend style AI list
  const chatContainerRef = useRef(null); // Chat container reference
  const plotContainerRef = useRef(null); // Plot container reference
  const cluesContainerRef = useRef(null); // Private clues container reference

  useEffect(() => {
    // Use sessionStorage instead of localStorage to avoid multi-tab conflicts
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    } else {
      router.push('/');
      return;
    }

    fetchRoomData();
  }, [params.id, router]);

  // If room is collected script, initialize rounds and story requirements
  useEffect(() => {
    if (room && (room).collectedScript) {
      const cs = (room).collectedScript;
      if (cs.rounds && rounds !== String(cs.rounds)) setRounds(String(cs.rounds));
      if (cs.plotRequirement && !plotRequirement) setPlotRequirement(cs.plotRequirement);
    }
  }, [room]);

  // 拉取我可用的好友风格（对方授权给我的）
  useEffect(() => {
    const loadFriendStyles = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch(`/api/users/${currentUser.id}/friend-styles`);
        const data = await res.json();
        if (data.success) setFriendStyles(data.friendStyles || []);
      } catch (e) {
        console.error('Failed to fetch friend styles', e);
      }
    };
    loadFriendStyles();
  }, [currentUser?.id]);

  // 启动实时同步轮询
  useEffect(() => {
    if (room && currentUser) {
      // 清除之前的轮询
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      let interval;
      
      if (room.status === 'playing' && room.gameId) {
        console.log('开始轮询游戏状态...');
        // 游戏中：轮询游戏数据
        interval = setInterval(() => {
          fetchGameData(room.gameId);
        }, 3000); // 每3秒检查一次
      } else if (room.status === 'waiting') {
        console.log('开始轮询房间状态...');
        // 等待中：轮询房间状态，检测是否开始游戏
        interval = setInterval(() => {
          fetchRoomData();
        }, 1000); // 减少到每1秒检查房间状态，提高响应速度
      }

      if (interval) {
        setPollingInterval(interval);
      }

      // 清理函数
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      // 如果没有房间或用户信息，清除轮询
      if (pollingInterval) {
        console.log('停止轮询');
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [room?.status, room?.gameId, currentUser]);

  // 游戏状态变化时清除轮询
  useEffect(() => {
    if (gameData?.status === 'finished' && pollingInterval) {
      console.log('游戏结束，停止轮询');
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [gameData?.status, pollingInterval]);

  // 组件卸载时清除轮询
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // 当房间数据加载完成且包含收藏剧本时，自动填充配置
  useEffect(() => {
    if (room?.collectedScript && currentUser?.id === room.hostId) {
      const script = room.collectedScript;
      setRounds(script.rounds.toString());
      setPlotRequirement(script.plotRequirement);
      // 不再自动设置AI类型，让房主自己选择
    }
  }, [room, currentUser]);

  // 初始化计数状态
  useEffect(() => {
    if (chatMessages.length > 0 && previousChatCount === 0) {
      setPreviousChatCount(chatMessages.length);
    }
    if (gameData?.roundRecords?.length > 0 && previousRoundCount === 0) {
      setPreviousRoundCount(gameData.roundRecords.length);
    }
  }, [chatMessages.length, gameData?.roundRecords?.length, previousChatCount, previousRoundCount]);

  // 自动滚动到聊天底部 - 只在有新消息且应该自动滚动时执行
  useEffect(() => {
    const currentChatCount = chatMessages.length;
    const hasNewMessages = currentChatCount > previousChatCount;
    
    if (hasNewMessages) {
      setPreviousChatCount(currentChatCount);
      
      // 只有在应该自动滚动且用户没有向上滚动时才滚动
      if (chatContainerRef.current && shouldAutoScroll && !userScrolledUp) {
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    }
  }, [chatMessages.length, shouldAutoScroll, userScrolledUp, previousChatCount]);

  // 监听聊天容器的滚动事件
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 5; // 允许5px的误差
      
      // 如果用户滚动到底部，重新启用自动滚动
      if (isAtBottom) {
        setUserScrolledUp(false);
        setShouldAutoScroll(true);
      } else {
        // 如果用户向上滚动，禁用自动滚动
        setUserScrolledUp(true);
        setShouldAutoScroll(false);
      }
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => {
      chatContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 监听剧情容器的滚动事件
  useEffect(() => {
    const plotContainer = plotContainerRef.current;
    if (!plotContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = plotContainer;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 5;
      setUserScrolledUpPlot(!isAtBottom);
    };

    plotContainer.addEventListener('scroll', handleScroll);
    return () => {
      plotContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 自动滚动到最新剧情 - 只在有新轮次时滚动
  useEffect(() => {
    const currentRoundCount = gameData?.roundRecords?.length || 0;
    const hasNewRound = currentRoundCount > previousRoundCount;
    
    if (hasNewRound && gameData?.script?.roundContents) {
      setPreviousRoundCount(currentRoundCount);
      
      // 只有在用户没有向上滚动时才自动滚动
      if (plotContainerRef.current && !userScrolledUpPlot) {
        setTimeout(() => {
          if (plotContainerRef.current) {
            plotContainerRef.current.scrollTop = plotContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    }
  }, [gameData?.roundRecords?.length, gameData?.script?.roundContents, previousRoundCount, userScrolledUpPlot]);

  // 监听线索容器的滚动事件
  useEffect(() => {
    const cluesContainer = cluesContainerRef.current;
    if (!cluesContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = cluesContainer;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 5;
      setUserScrolledUpClues(!isAtBottom);
    };

    cluesContainer.addEventListener('scroll', handleScroll);
    return () => {
      cluesContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 自动滚动到最新线索 - 只在有新轮次时滚动
  useEffect(() => {
    const currentRoundCount = gameData?.roundRecords?.length || 0;
    const hasNewRound = currentRoundCount > previousRoundCount;
    
    if (hasNewRound) {
      // 只有在用户没有向上滚动时才自动滚动
      if (!userScrolledUpClues) {
        setTimeout(() => {
          const currentRound = gameData?.roundRecords?.length || 0;
          const target = document.querySelector(`#clue-round-${currentRound}`);
          if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else if (cluesContainerRef.current) {
            // fallback
            cluesContainerRef.current.scrollTop = cluesContainerRef.current.scrollHeight;
          }
        }, 200);
      }
    }
  }, [gameData?.roundRecords?.length, previousRoundCount, userScrolledUpClues]);

  const fetchRoomData = async () => {
    try {
      const response = await fetch(`/api/rooms/${params.id}`);
      const data = await response.json();
      
      if (data.success) {
        const newRoom = data.room;
        
        // 检测房间状态变化
        if (room && room.status !== newRoom.status) {
          console.log(`房间状态变化: ${room.status} -> ${newRoom.status}`);
          
          // 如果从等待状态变为游戏状态，自动获取游戏数据
          if (room.status === 'waiting' && newRoom.status === 'playing' && newRoom.gameId) {
            console.log('检测到游戏开始，自动进入游戏界面');
            // 立即获取游戏数据，不延迟
            fetchGameData(newRoom.gameId);
          }
        }
        
        setRoom(newRoom);
        setPlayers(data.players);
        
        // 如果游戏已开始且是首次加载，获取游戏数据
        if (newRoom.status === 'playing' && newRoom.gameId && !room) {
          console.log('首次加载检测到游戏已开始，获取游戏数据');
          fetchGameData(newRoom.gameId);
        }
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch room data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchGameData = async (gameId) => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      const data = await response.json();
      if (data.success) {
        const newGameData = data.gameRecord;
        
        // 检查游戏是否结束
        if (newGameData.status === 'finished' && (!gameData || gameData.status !== 'finished')) {
          console.log('检测到游戏结束，显示游戏复盘');
          // 停止轮询
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          // 为所有真人玩家生成复盘，不显示收藏选项
          setTimeout(() => {
            generateSummariesForAllPlayers();
            setShowGameSummary(true);
            // 游戏结束后检查收藏状态
            checkScriptCollectionStatus(newGameData.id);
          }, 1000); // 稍微延迟一下，确保界面更新完成
        }
        
        // 检查轮次是否发生变化
        if (gameData && newGameData.roundRecords.length !== gameData.roundRecords.length) {
          console.log('游戏轮次发生变化，刷新界面');
        }
        
        // 更新聊天消息：合并所有轮次的聊天记录
        const allMessages = [];
        if (newGameData.roundRecords && newGameData.roundRecords.length > 0) {
          for (const roundRecord of newGameData.roundRecords) {
            if (roundRecord.messages && roundRecord.messages.length > 0) {
              // 为每条消息添加轮次信息
              const messagesWithRound = roundRecord.messages.map(msg => ({
                ...msg,
                roundNumber: roundRecord.round
              }));
              allMessages.push(...messagesWithRound);
            }
          }
        }
        
        setChatMessages(allMessages);
        
        setGameData(newGameData);
        
        // 检查是否已收藏该剧本
        checkScriptCollectionStatus(newGameData.id);
        
        // 获取准备状态
        if (newGameData.readyPlayers) {
          setReadyPlayers(new Set(newGameData.readyPlayers));
        }
      }
    } catch (error) {
      console.error('Failed to fetch game data:', error);
    }
  };

  // 检查剧本收藏状态
  const checkScriptCollectionStatus = async (gameId) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/users/${currentUser.id}/profile`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user.collectedScripts) {
          const isCollected = data.user.collectedScripts.some(
            script => script.originalGameId === gameId
          );
          setIsScriptCollected(isCollected);
        }
      }
    } catch (error) {
      console.error('Failed to check collection status:', error);
    }
  };

  // AI类型数量管理函数
  const adjustAICount = (type, delta) => {
    const newSelectedTypes = new Map(selectedAITypes);
    const currentCount = newSelectedTypes.get(type) || 0;
    const newCount = Math.max(0, currentCount + delta);
    
    if (newCount === 0) {
      newSelectedTypes.delete(type);
    } else {
      newSelectedTypes.set(type, newCount);
    }
    setSelectedAITypes(newSelectedTypes);
  };

  const startGame = async () => {
    // 收藏剧本无需剧情要求
    if (!room.collectedScript && !plotRequirement.trim()) {
      alert('Please enter plot requirements');
      return;
    }

    const roundCount = parseInt(rounds);
    if (isNaN(roundCount) || roundCount < 1 || roundCount > 30) {
      alert('Please enter a valid number of rounds (1-30）');
      return;
    }

    // 如果是收藏剧本，检查AI数量是否正确
    if (room.collectedScript) {
      const requiredAICount = room.collectedScript.characters?.filter(c => !c.isMainCharacter).length || 0;
      const selectedAICount = Array.from(selectedAITypes.values()).reduce((sum, count) => sum + count, 0);
      
      if (selectedAICount !== requiredAICount) {
        alert(`please select ${requiredAICount} AI NPC，current selected ${selectedAICount}`);
        return;
      }
    }

    // 构建AI NPC数组，根据数量重复类型
    const aiNPCTypes = [];
    for (const [type, count] of selectedAITypes) {
      for (let i = 0; i < count; i++) {
        aiNPCTypes.push(type);
      }
    }

    setStartingGame(true); // 开始加载状态

    try {
      console.log('开始发送游戏创建请求...');
      const response = await fetch(`/api/rooms/${params.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rounds: room.collectedScript ? room.collectedScript.rounds : roundCount,
          plotRequirement: room.collectedScript ? (room.collectedScript.plotRequirement || 'Importing scripts externally') : plotRequirement,
          aiNPCTypes: aiNPCTypes,
          friendStyleNPCs: selectedFriendStyles // 可能为空
        })
      });

      console.log('游戏创建请求返回:', response.status);
      const data = await response.json();
      
      if (data.success) {
        console.log('游戏创建成功，刷新房间数据');
        // 立即刷新数据，然后再进行几次额外刷新确保同步
        fetchRoomData();
        
        // 额外的刷新确保其他玩家能够快速同步状态
        setTimeout(() => fetchRoomData(), 500);
        setTimeout(() => fetchRoomData(), 1500);
      } else {
        console.error('Game creation failed:', data.error);
        let errorMessage = 'Failed to start game';
        
        if (data.error.includes('503') || data.error.includes('Service Unavailable')) {
          errorMessage = 'AI service is temporarily unavailable, please try again later.';
        } else if (data.error.includes('timeout')) {
          errorMessage = 'Request timed out, please check network connection and try again';
        } else if (data.error) {
          errorMessage = `Failed to start the game:${data.error}`;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      let errorMessage = 'Failed to start game';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network connection failed, please check the network and try again';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out, please try again';
      } else {
        errorMessage = 'Failed to start game, please try again';
      }
      
      alert(errorMessage);
    } finally {
      setStartingGame(false); // 结束加载状态
    }
  };

  // ===== 语音转文字（Aliyun DashScope via server transcription） =====
  const beginSTT = async () => {
    try {
      setSttError('');
      // Request mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      sttMediaRecorderRef.current = mr;
      sttChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) sttChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        try {
          const blob = new Blob(sttChunksRef.current, { type: 'audio/webm' });
          const form = new FormData();
          form.append('audio', blob, 'speech.webm');
          form.append('language', 'zh');
          const dashscopeKey = typeof window !== 'undefined' ? sessionStorage.getItem('dashscopeKey') : null;
          const res = await fetch('/api/speech/transcribe', {
            method: 'POST',
            headers: dashscopeKey ? { 'x-dashscope-key': dashscopeKey } : undefined,
            body: form,
          });
          const data = await res.json();
          if (!data.success) {
            console.warn('STT failure details:', data);
            throw new Error(data.error || 'Transcription failure');
          }
          if (!data.text) {
            console.warn('STT returned success but empty text:', data);
          }
          setNewMessage((prev) => (prev ? `${prev} ${data.text || ''}` : (data.text || '')));
        } catch (err) {
          setSttError((err && err.message) ? err.message : 'Transcription failure');
        } finally {
          // stop tracks
          stream.getTracks().forEach(t => t.stop());
        }
      };
      mr.start();
      setSttOn(true);
    } catch (err) {
      setSttError(err.message || 'Unable to access the microphone');
      setSttOn(false);
    }
  };

  const endSTT = async () => {
    try {
      const mr = sttMediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        mr.stop();
      }
      sttMediaRecorderRef.current = null;
    } catch {}
    setSttOn(false);
  };

  const leaveRoom = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/rooms/${params.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      
      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading room information...</div>
      </div>
    );
  }

  if (!room || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Room does not exist or has been deleted</div>
      </div>
    );
  }

  const isHost = currentUser.id === room.hostId;

  // 获取玩家角色名的辅助函数
  const getPlayerCharacterName = (playerId) => {
    if (!gameData?.playerCharacters || !gameData?.script?.characters) return null;
    const characterId = gameData.playerCharacters[playerId];
    const character = gameData.script.characters.find(c => c.id === characterId);
    return character?.name;
  };

  // 获取AI角色名和类型的辅助函数
  const getAICharacterInfo = (aiNPC) => {
    if (!gameData?.script?.characters) return { characterName: null, typeName: null };
    const character = gameData.script.characters.find(c => c.id === aiNPC.characterId);
    return {
      characterName: character?.name || aiNPC.characterName,
      typeName: aiNPC.name || aiNPC.type
    };
  };

  // 游戏界面渲染
  const renderGameInterface = () => {
    if (!gameData) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <h3 className="text-xl font-bold mb-4">Loading game data in ...</h3>
            <p className="text-slate-300">Please wait while we get the script information...</p>
          </div>
        </div>
      );
    }

    const currentRound = gameData.roundRecords.length;
    const script = gameData.script || {};
    const currentRoundContent = script.roundContents?.[currentRound - 1];

    return (
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：玩家列表和AI角色 */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-r border-purple-500/30 flex flex-col">
          {/* 玩家列表 */}
          <div className="p-6 border-b border-purple-500/20">
            <h2 className="text-lg font-bold text-white mb-4">player list</h2>
            <div className="space-y-3">
              {players.map((player) => {
                const characterName = getPlayerCharacterName(player.id);
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {player.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{player.username}</div>
                        {characterName && (
                          <div className="text-purple-300 text-xs">play the role of: {characterName}</div>
                        )}
                      </div>
                    </div>
                    {player.id === room.hostId && (
                      <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                        Room owner
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI角色列表 */}
          {gameData?.aiNPCs && gameData.aiNPCs.length > 0 && (
            <div className="p-6 flex-1 overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">AI role</h2>
              <div className="space-y-3">
                {gameData.aiNPCs.map((ai) => {
                  const { characterName, typeName } = getAICharacterInfo(ai);
                  return (
                    <div
                      key={ai.id}
                      className="p-3 bg-slate-700/50 rounded-lg border border-blue-500/30"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">AI</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{characterName || typeName}</div>
                          <div className="text-blue-300 text-xs">{typeName}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 中间：剧情显示区域 */}
        <div className="flex-1 flex flex-col bg-slate-900/50">
          {/* 当前剧情 */}
          <div className="p-6 border-b border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">📖 plots</h3>
              {/* 房主控制按钮 */}
              {isHost && currentRoundContent && (
                <div className="flex items-center space-x-2">
                  {currentRound < gameData?.rounds ? (
                    <button
                      onClick={advanceToNextRound}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Moving on to the next round →
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg text-sm">
                      final round ✓
                    </div>
                  )}
                </div>
              )}
              
              {/* 最后一轮所有玩家都可以结束故事 */}
              {currentRound === gameData?.rounds && currentRoundContent && (
                <button
                  onClick={endStory}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Conclusion of the story 🏁
                </button>
              )}
            </div>
            
            {/* 剧情滚动区域 */}
            <div className="relative">
              <div 
                ref={plotContainerRef}
                className="max-h-64 overflow-y-auto space-y-4"
                style={{ scrollBehavior: 'smooth' }}
              >
                {gameData?.script?.roundContents?.map((roundContent, index) => {
                  const roundNumber = roundContent.round;
                  const isCurrentRound = roundNumber === currentRound;
                  const hasReached = roundNumber <= currentRound;
                  
                  if (!hasReached) return null; // 只显示已经到达的轮次
                  
                  return (
                    <div 
                      key={roundNumber}
                      className={`rounded-xl border p-4 transition-all ${
                        isCurrentRound 
                          ? 'bg-slate-800/70 border-purple-500/50 ring-1 ring-purple-500/30' 
                          : 'bg-slate-800/30 border-slate-600/50'
                      }`}
                    >
                      <div className={`text-sm mb-2 flex items-center justify-between ${
                        isCurrentRound ? 'text-purple-300' : 'text-slate-400'
                      }`}>
                        <span>round No. {roundNumber}  /  {gameData?.rounds} total</span>
                        {isCurrentRound && <span className="text-xs bg-purple-600 px-2 py-1 rounded">current</span>}
                      </div>
                      <div className={`leading-relaxed ${
                        isCurrentRound ? 'text-white' : 'text-slate-300'
                      }`}>
                        {(() => {
                          const myCharacterId = gameData?.playerCharacters?.[currentUser?.id];
                          const personalScript = myCharacterId ? gameData?.personalScripts?.[myCharacterId] : null;
                          const personalRoundContent = personalScript?.personalRoundContents?.find(prc => prc.round === roundNumber);
                          return personalRoundContent?.personalPlot || roundContent.plot || '剧情加载中...';
                        })()}
                      </div>
                    </div>
                  );
                })}
                
                {/* 准备按钮区域 - 只在故事阅读状态且没有剧情轮次时显示 */}
                {gameData?.status === 'story_reading' && currentRound === 0 && (
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
                    <div className="text-center text-slate-400">
                      <div>
                        <p className="mb-4">Please read your backstory carefully</p>
                        {!readyPlayers.has(currentUser?.id) && (
                          <button
                            onClick={markPlayerReady}
                            className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all"
                          >
                            Finished reading and started the plot
                          </button>
                        )}
                        {readyPlayers.has(currentUser?.id) && (
                          <div>
                            <p className="text-green-400 mb-2">✅ Ready</p>
                            <p className="text-sm">Waiting for other players to prepare... ({readyPlayers.size}/{players.length})</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 空剧情提示 - 只在真正没有剧情且不在故事阅读状态时显示 */}
                {(!gameData?.script?.roundContents || gameData.script.roundContents.length === 0) && 
                 gameData?.status !== 'story_reading' && (
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
                    <div className="text-center text-slate-400">
                      Waiting for the episode to start...
                    </div>
                  </div>
                )}
              </div>
              
              {/* 剧情回到底部按钮 */}
              {userScrolledUpPlot && (
                <div className="absolute bottom-2 right-2 z-10">
                  <button
                    onClick={() => {
                      setUserScrolledUpPlot(false);
                      if (plotContainerRef.current) {
                        plotContainerRef.current.scrollTop = plotContainerRef.current.scrollHeight;
                      }
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-200 flex items-center space-x-1 text-xs"
                  >
                    <span>latest</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 聊天区域 */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="p-6 pb-2 flex-shrink-0">
              <h3 className="text-lg font-bold text-white mb-4">💬 feedback</h3>
            </div>
            <div 
              ref={chatContainerRef}
              className="flex-1 px-6 pb-4 overflow-y-auto min-h-0"
              style={{ maxHeight: 'calc(100vh - 400px)' }}
            >
              <div className="space-y-4">
                {(() => {
                  // 按轮次分组聊天记录
                  const messagesByRound = {};
                  chatMessages.forEach(message => {
                    const round = message.roundNumber || 1;
                    if (!messagesByRound[round]) {
                      messagesByRound[round] = [];
                    }
                    messagesByRound[round].push(message);
                  });

                  const rounds = Object.keys(messagesByRound).sort((a, b) => Number(a) - Number(b));
                  
                  if (rounds.length === 0) {
                    return (
                      <div className="text-center text-slate-400 py-8">
                        No discussion for now, start your reasoning!
                      </div>
                    );
                  }

                  return rounds.map(round => (
                    <div key={round} className="space-y-3">
                      {/* 轮次分隔符 */}
                      <div className="flex items-center justify-center my-4">
                        <div className="flex-1 h-px bg-purple-500/30"></div>
                        <div className="px-4 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-medium">
                          discuss round: {round}
                        </div>
                        <div className="flex-1 h-px bg-purple-500/30"></div>
                      </div>
                      
                      {/* 该轮次的消息 */}
                      {messagesByRound[round].map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg max-w-[80%] ${
                            message.isNPC
                              ? 'bg-blue-600/20 border border-blue-500/30 ml-4'
                              : message.senderId === currentUser?.id
                              ? 'bg-purple-600/20 border border-purple-500/30 ml-auto'
                              : 'bg-slate-600/20 border border-slate-500/30'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-sm font-medium ${
                              message.isNPC ? 'text-blue-300' : 'text-purple-300'
                            }`}>
                              {message.senderName || 'Anonymous'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-white text-sm">{message.content}</div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>
            
            {/* 回到底部按钮 - 只在用户向上滚动时显示 */}
            {userScrolledUp && (
              <div className="absolute bottom-20 right-6 z-10">
                <button
                  onClick={() => {
                    setUserScrolledUp(false);
                    setShouldAutoScroll(true);
                    if (chatContainerRef.current) {
                      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <span className="text-sm">back to the end</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* 消息输入 */}
            <div className="p-6 pt-4 border-t border-purple-500/20 flex-shrink-0">
              <div className="flex space-x-3">
                {/* 语音转文字控制 */}
                <button
                  onClick={sttOn ? endSTT : beginSTT}
                  className={`px-3 py-2 rounded-lg text-white ${sttOn ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  title={sttOn ? 'finish' : 'turn on the microphone' }
                >
                  {sttOn ? 'finished' : 'microphone'}
                </button>
                {/* 临时Key输入已移除（改为配置 .env.local） */}
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all"
                >
                  Send
                </button>
              </div>
              {sttError && <div className="text-red-400 text-xs mt-2">{sttError}</div>}
            </div>
          </div>
        </div>

        {/* 右侧：个人信息和线索 */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-purple-500/30 flex flex-col">
          {/* 角色信息 */}
          <div className="p-6 border-b border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-4">🎭 My Role</h3>
            {(() => {
              const myCharacterId = gameData?.playerCharacters?.[currentUser?.id];
              const myCharacter = gameData?.script?.characters?.find(c => c.id === myCharacterId);
              
              return myCharacter ? (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-yellow-300 font-bold text-lg mb-2">{myCharacter.name}</div>
                  <div className="text-slate-300 text-sm mb-2">{myCharacter.identity}</div>
                  <div className="text-slate-400 text-xs">{myCharacter.personality}</div>
                </div>
              ) : (
                <div className="text-slate-400 text-center py-4">Character information loading...</div>
              );
            })()}
          </div>

          {/* 故事背景 */}
          <div className="p-6 border-b border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-4">🌟 My backstory.</h3>
            <div className="bg-slate-700/50 rounded-lg p-4 max-h-40 overflow-y-auto">
              <div className="text-slate-300 text-sm leading-relaxed">
                {(() => {
                  const myCharacterId = gameData?.playerCharacters?.[currentUser?.id];
                  const personalScript = myCharacterId ? gameData?.personalScripts?.[myCharacterId] : null;
                  return personalScript?.personalBackground || gameData?.scriptBackground || 'Background loading...';
                })()}
              </div>
            </div>
          </div>

          {/* 私人线索 */}
          <div className="p-6 flex-1 overflow-y-auto relative">
            <h3 className="text-lg font-bold text-white mb-4">🔍 私人信息</h3>
            
            {(() => {
              const myCharacterId = gameData?.playerCharacters?.[currentUser?.id];
              const personalScript = myCharacterId ? gameData?.personalScripts?.[myCharacterId] : null;
              const currentRound = gameData?.roundRecords?.length || 0;
              
              // 获取所有已进行轮次的线索
              const allClues = [];
              
              for (let round = 1; round <= currentRound; round++) {
                const roundRecord = gameData?.roundRecords?.find(rr => rr.round === round);
                const userClue = roundRecord?.privateClues?.[myCharacterId];
                const personalRoundContent = personalScript?.personalRoundContents?.find(prc => prc.round === round);
                const hiddenInfo = personalRoundContent?.hiddenInfo;
                
                if (userClue || hiddenInfo) {
                  allClues.push({
                    round,
                    userClue,
                    hiddenInfo,
                    isCurrentRound: round === currentRound
                  });
                }
              }

              if (allClues.length === 0) {
                return (
                  <div className="text-slate-400 text-center py-4 text-sm">
                    {currentRound > 0 ? 'No private information' : 'A message will be displayed when the game starts'}
                  </div>
                );
              }

              return (
                <div className="relative">
                  <div 
                    ref={cluesContainerRef}
                    className="max-h-full overflow-y-auto space-y-4"
                    style={{ scrollBehavior: 'smooth' }}
                  >
          {allClues.map((clueData) => (
                      <div 
            key={clueData.round}
            id={`clue-round-${clueData.round}`}
                        className={`rounded-xl border transition-all ${
                          clueData.isCurrentRound 
                            ? 'bg-slate-800/70 border-purple-500/50 ring-1 ring-purple-500/30' 
                            : 'bg-slate-800/30 border-slate-600/50'
                        }`}
                      >
                        {/* 轮次标题 */}
                        <div className={`px-4 py-2 border-b ${
                          clueData.isCurrentRound 
                            ? 'border-purple-500/30 text-purple-300' 
                            : 'border-slate-600/30 text-slate-400'
                        } text-sm font-semibold flex items-center justify-between`}>
                          <span>No. of thread of the story: {clueData.round}</span>
                          {clueData.isCurrentRound && (
                            <span className="text-xs bg-purple-600 px-2 py-1 rounded">current</span>
                          )}
                        </div>
                        
                        {/* 线索内容 */}
                        <div className="p-4 space-y-3">
                          {/* 剧情线索 */}
                          {clueData.userClue && (
                            <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/30">
                              <div className="text-yellow-300 text-xs font-semibold mb-2">📋 thread</div>
                              <div className={`text-sm leading-relaxed ${
                                clueData.isCurrentRound ? 'text-yellow-100' : 'text-yellow-200/70'
                              }`}>
                                {clueData.userClue}
                              </div>
                            </div>
                          )}
                          
                          {/* 隐藏信息 */}
                          {clueData.hiddenInfo && (
                            <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                              <div className="text-red-300 text-xs font-semibold mb-2">🤫 secret message</div>
                              <div className={`text-sm leading-relaxed ${
                                clueData.isCurrentRound ? 'text-red-100' : 'text-red-200/70'
                              }`}>
                                {clueData.hiddenInfo}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 线索回到底部按钮 */}
                  {userScrolledUpClues && (
                    <div className="absolute bottom-2 right-2 z-10">
                      <button
                        onClick={() => {
                          setUserScrolledUpClues(false);
                          if (cluesContainerRef.current) {
                            cluesContainerRef.current.scrollTop = cluesContainerRef.current.scrollHeight;
                          }
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-200 flex items-center space-x-1 text-xs"
                      >
                        <span>latest</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  // 渲染游戏复盘界面
  const renderGameSummary = () => {
    console.log('渲染复盘界面，gameSummary:', gameSummary);
    
    if (!gameSummary) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-bold mb-2">A game replay is being generated...</h3>
            <p className="text-slate-300">Please wait. The AI is analyzing the game.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
              🎭 Game Review
            </h1>
            <p className="text-gray-300">Recap and in-depth analysis of the game</p>
          </div>

          {/* 故事相关复盘 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 故事复盘 */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
              <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center">
                📚 The story of the inning resumed
              </h2>
              <div className="text-gray-300 leading-relaxed text-sm">
                {gameSummary.storyReview || '故事复盘内容生成中...'}
              </div>
            </div>

            {/* 精彩点解密 */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-green-500/30 p-6">
              <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center">
                💡 Highlights Declassified
              </h2>
              <div className="text-gray-300 leading-relaxed text-sm">
                {gameSummary.plotAnalysis || '精彩点分析生成中...'}
              </div>
            </div>

            {/* 故事升华 */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
              <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center">
                ✨ Story Sublimation
              </h2>
              <div className="text-gray-300 leading-relaxed text-sm">
                {gameSummary.storyElevation || '故事升华内容生成中...'}
              </div>
            </div>
          </div>

          {/* 玩家表现分析 */}
          {Object.values(gameSummary.playerAnalysis || {}).length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-pink-500/30 p-6">
              <h2 className="text-2xl font-bold text-pink-400 mb-6 flex items-center">
                👥 Player Performance Analysis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.values(gameSummary.playerAnalysis).map((analysis, index) => (
                  <div key={index} className="bg-slate-700/30 rounded-lg p-6 border border-cyan-500/20">
                    <h3 className="text-lg font-bold text-cyan-300 mb-4 flex items-center">
                      🎯 {analysis.playerName}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-yellow-300 mb-2">💭 Summary of views</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {analysis.viewpointSummary}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-green-300 mb-2">🎬 plot contribution</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {analysis.plotRelatedComment}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-purple-300 mb-2">🗣️ Presentation style</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {analysis.styleComment}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="text-center pt-6">
            <button
              onClick={collectScript}
              disabled={isScriptCollected}
              className={`px-8 py-3 text-white font-bold rounded-lg transition-all duration-300 mr-4 ${
                isScriptCollected 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              }`}
            >
              {isScriptCollected ? '✅ Favorited' : '📚 Add to favorite'}
            </button>
            <button
              onClick={() => setShowGameSummary(false)}
              className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-lg transition-all duration-300 mr-4"
            >
              🔙 Back to game
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg transition-all duration-300"
            >
              🏠 Back to home
            </button>
          </div>
        </div>
      </div>
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // 获取当前用户的角色名
    const myCharacterId = gameData?.playerCharacters?.[currentUser?.id];
    const myCharacter = gameData?.script?.characters?.find(c => c.id === myCharacterId);
    const characterName = myCharacter?.name || currentUser.username;

    const messageData = {
      username: characterName, // 使用角色名而不是真人名
      content: newMessage.trim(),
      timestamp: Date.now(),
      userId: currentUser.id,
      characterId: myCharacterId // 添加角色ID信息
    };

    try {
      const response = await fetch(`/api/games/${gameData.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.message) {
          // 为新消息添加轮次信息
          const messageWithRound = {
            ...result.message,
            roundNumber: gameData?.roundRecords?.length || 1
          };
          setChatMessages([...chatMessages, messageWithRound]);
          setNewMessage('');
          
          // 用户发送消息后，重新启用自动滚动
          setUserScrolledUp(false);
          setShouldAutoScroll(true);
          
          // 触发AI NPC轮询回复
          triggerAIPollingResponse(messageWithRound);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // AI NPC轮询回复功能 - 实现您要求的轮询逻辑
  const triggerAIPollingResponse = async (userMessage) => {
    if (!gameData?.aiNPCs || gameData.aiNPCs.length === 0) return;
    
    try {
      // 轮询每个AI NPC，让LLM决定是否接话
      for (const aiNPC of gameData.aiNPCs) {
        // 获取更新后的聊天消息列表（包含刚发送的消息）
        const updatedMessages = [...chatMessages, userMessage];
        
        const response = await fetch(`/api/games/${gameData.id}/ai-polling`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: userMessage, // 传递完整的用户消息对象
            aiNPC: aiNPC,
            gameContext: {
              background: gameData.scriptBackground,
              currentRound: gameData.roundRecords.length,
              currentPlot: gameData.roundRecords[gameData.roundRecords.length - 1]?.plot,
              privateClues: gameData.roundRecords[gameData.roundRecords.length - 1]?.privateClues,
              recentMessages: updatedMessages.slice(-10), // 包含最新消息的上下文
              lastMessage: userMessage // 明确标记最新的用户消息
            }
          })
        });

        if (response.ok) {
          const aiResult = await response.json();
          if (aiResult.success && aiResult.shouldSpeak && aiResult.message) {
            setChatMessages(prev => [...prev, aiResult.message]);
            // AI回复时也启用自动滚动（如果用户没有向上滚动）
            if (!userScrolledUp) {
              setShouldAutoScroll(true);
            }
            // 给AI之间一点响应间隔，避免同时说话
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
    } catch (error) {
      console.error('Failed to get AI polling response:', error);
    }
  };

  // 标记玩家已准备
  const markPlayerReady = async () => {
    if (!currentUser || readyPlayers.has(currentUser.id)) return;
    
    try {
      const response = await fetch(`/api/games/${gameData.id}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentUser.id })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setReadyPlayers(new Set([...readyPlayers, currentUser.id]));
          
          // 检查是否所有玩家都准备好了
          if (result.allReady) {
            // 开始第一轮剧情
            fetchGameData(gameData.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to mark ready:', error);
    }
  };

  // 房主控制进入下一轮
  const advanceToNextRound = async () => {
    if (!isHost || !gameData) return;
    
    const currentRound = gameData.roundRecords.length;
    const nextRound = currentRound + 1;
    
    if (nextRound > gameData.rounds) {
      alert('This is the last round！');
      return;
    }
    
    try {
      const response = await fetch(`/api/games/${gameData.id}/advance-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentRound: currentRound,
          nextRound: nextRound
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 刷新游戏数据
          fetchGameData(gameData.id);
        } else {
          alert('Failure to advance to the next round：' + result.error);
        }
      } else {
        alert('Failure to advance to the next round');
      }
    } catch (error) {
      console.error('Failed to advance round:', error);
      alert('Failure to advance to the next round');
    }
  };

  // 结束故事功能
  const endStory = async () => {
    if (!gameData || !currentUser) return;
    
    try {
      const response = await fetch(`/api/games/${gameData.id}/end-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: currentUser.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 为所有真人玩家生成复盘
          await generateSummariesForAllPlayers();
          setShowGameSummary(true);
          
          console.log(`Game over by ${result.endedBy}`);
        } else {
          alert('End Story Failure' + result.error);
        }
      } else {
        alert('End Story Failure');
      }
    } catch (error) {
      console.error('Failed to end story:', error);
      alert('End Story Failure');
    }
  };

  // 收藏剧本功能
  const collectScript = async () => {
    if (!gameData || !currentUser) return;
    
    try {
      const response = await fetch(`/api/users/${currentUser.id}/collect-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scriptId: gameData.scriptId,
          gameId: gameData.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 收藏成功，触发用户数据更新事件并更新状态
          console.log('剧本收藏成功');
          setIsScriptCollected(true); // 设置已收藏状态
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('userDataUpdated'));
          }
        } else {
          alert('Collection Failure：' + result.error);
        }
      } else {
        alert('Collection Failure');
      }
    } catch (error) {
      console.error('Failed to collect script:', error);
      alert('Collection Failure');
    }
  };

  // 为所有真人玩家生成复盘
  const generateSummariesForAllPlayers = async () => {
    if (!gameData || !currentUser) return;

    // 获取所有真人玩家ID
    const humanPlayers = gameData.players || [];
    
    try {
      // 设置加载状态
      setGameSummary({
        storyReview: 'A replay is being generated for all players...',
        plotAnalysis: 'Wonderful points being analyzed...',
        storyElevation: 'The story is being sublimated...',
        playerAnalysis: {}
      });

      // 为当前用户生成复盘
      const response = await fetch(`/api/games/${gameData.id}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: currentUser.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.summary) {
          setGameSummary(result.summary);
          return;
        }
      }

      // 如果获取失败，显示错误信息
      setGameSummary({
        storyReview: 'Replay generation failed. Please try again later.',
        plotAnalysis: 'Analysis generation failed, please try again later',
        storyElevation: 'Sublimation generation failed. Please try again later.',
        playerAnalysis: {}
      });

    } catch (error) {
      console.error('Failed to generate summaries for all players:', error);
      setGameSummary({
        storyReview: 'Replay generation failed. Please try again later.',
        plotAnalysis: 'Analysis generation failed, please try again later',
        storyElevation: 'Sublimation generation failed. Please try again later.',
        playerAnalysis: {}
      });
    }
  };
  const getOrGenerateGameSummary = async () => {
    if (!gameData || !currentUser) return;

    try {
      // 先尝试获取已有的复盘
      const response = await fetch(`/api/games/${gameData.id}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: currentUser.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('复盘API返回结果:', result);
        if (result.success && result.summary) {
          console.log('设置复盘数据:', result.summary);
          setGameSummary(result.summary);
          return;
        } else {
          console.error('API成功但数据无效:', result);
        }
      } else {
        console.error('API请求失败:', response.status);
      }

      // 如果获取失败，显示错误信息
      console.error('获取复盘失败');
      setGameSummary({
        storyReview: 'The review is being generated, please wait...',
        plotAnalysis: 'The review is being generated, please wait...',
        storyElevation: 'The review is being generated, please wait...',
        playerAnalysis: {}
      });

      // 等待一段时间后重试
      setTimeout(() => {
        getOrGenerateGameSummary();
      }, 3000);

    } catch (error) {
      console.error('Failed to get summary:', error);
      // 设置重试状态
      setGameSummary({
        storyReview: 'Retrying to get the replay...',
        plotAnalysis: 'Retrying to get the replay...',
        storyElevation: 'Retrying to get the replay...',
        playerAnalysis: {}
      });

      // 3秒后重试
      setTimeout(() => {
        getOrGenerateGameSummary();
      }, 3000);
    }
  };

  // 生成游戏复盘（保留原函数供手动调用）
  const generateGameSummary = async () => {
    if (!gameData || !currentUser) return;

    try {
      // 设置加载状态
      setGameSummary({
        storyReview: 'Story review being generated...',
        plotAnalysis: 'Analyzing the highlights...',
        storyElevation: 'The story is being sublimated...',
        playerAnalysis: {}
      });

      const response = await fetch(`/api/games/${gameData.id}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: currentUser.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGameSummary(result.summary);
        } else {
          console.error('生成复盘失败：', result.error);
          // 设置错误状态
          setGameSummary({
            storyReview: `Repeat Generation Failure：${result.error}`,
            plotAnalysis: `Analysis Generation Failure：${result.error}`,
            storyElevation: `Sublimation Generation Failure：${result.error}`,
            playerAnalysis: {}
          });
        }
      } else {
        const errorText = await response.text();
        console.error('生成复盘请求失败：', response.status, errorText);
        setGameSummary({
          storyReview: `Replay generation failed: network error ${response.status}`,
          plotAnalysis: `Failed to analyze generation: network error ${response.status}`,
          storyElevation: `Sublimation generation failed: network error ${response.status}`,
          playerAnalysis: {}
        });
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      // 设置默认复盘
      setGameSummary({
        storyReview: 'Replay generation failed. Please try again later.',
        plotAnalysis: 'Analysis generation failed, please try again later',
        storyElevation: 'Sublimation generation failed. Please try again later.',
        playerAnalysis: {}
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="h-screen flex flex-col">
        {/* 房间标题栏 */}
        <div className="bg-slate-800/50 backdrop-blur-sm border-b border-purple-500/30 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{room.name}</h1>
              <p className="text-purple-300 text-sm">Room No.: {room.id} | Status: {
                room.status === 'waiting' ? '等待中' : 
                room.status === 'playing' ? '游戏中' : '已结束'
              }</p>
            </div>
            <button
              onClick={leaveRoom}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* 根据游戏状态显示不同界面 */}
        {room.status === 'playing' ? (
          showGameSummary ? renderGameSummary() : renderGameInterface()
        ) : (
          <div className="flex-1 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {/* 左侧：玩家列表和AI选择 */}
              <div className="lg:col-span-1">
                {/* 玩家列表 */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6 mb-6">
                  <h2 className="text-xl font-bold text-white mb-4">
                    player list ({players.length})
                  </h2>
                  <div className="space-y-3">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {player.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white">{player.username}</span>
                          {player.id === room.hostId && (
                            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                              Room Owner
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI NPC选择 */}
                {isHost && room.status === 'waiting' && (
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                      selecte AI NPC (selected: {Array.from(selectedAITypes.values()).reduce((sum, count) => sum + count, 0)}个
                      {room.collectedScript ? (() => {
                        const aiCharacterCount = room.collectedScript.characters?.filter(c => !c.isMainCharacter).length || 0;
                        return aiCharacterCount > 0 ? ` / ${aiCharacterCount} required` : '';
                      })() : ' / free choice'})
                    </h3>
                    <div className="space-y-3">
                      {AI_CHARACTER_TYPES.map((type) => {
                        const count = selectedAITypes.get(type.id) || 0;
                        return (
                          <div
                            key={type.id}
                            className={`p-3 rounded-lg border transition-all ${
                              count > 0
                                ? 'bg-purple-600/30 border-purple-400 ring-1 ring-purple-500'
                                : 'bg-slate-700/50 border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-white font-medium text-sm">{type.name}</div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => adjustAICount(type.id, -1)}
                                  disabled={count === 0}
                                  className="w-6 h-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed text-xs"
                                >
                                  -
                                </button>
                                <span className="text-white font-bold w-6 text-center text-sm">{count}</span>
                                <button
                                  onClick={() => adjustAICount(type.id, 1)}
                                  className="w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center transition-colors text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="text-slate-300 text-xs">{type.description}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 好友风格 AINPC 选择 */}
                    <FriendStylePicker currentUser={currentUser} onChange={(list) => setSelectedFriendStyles(list)} />
                  </div>
                )}
              </div>

              {/* 右侧：游戏配置 */}
              <div className="lg:col-span-2">
                {isHost && room.status === 'waiting' && (
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
                    <h2 className="text-xl font-bold text-white mb-6">
                      {room.collectedScript ? 'Favorite Script Configuration' : 'game configuration'}
                    </h2>
                    
                    {/* 如果是收藏剧本，显示剧本信息 */}
                    {room.collectedScript && (
                      <div className="mb-6 p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg">
                        <h3 className="text-white font-medium mb-2">📚 {room.collectedScript.title}</h3>
                        <p className="text-purple-200 text-sm mb-2">
                          round {room.collectedScript.rounds} · 
                          need {room.collectedScript.characters?.filter(c => c.isMainCharacter).length || 0} real players· 
                          {room.collectedScript.characters?.filter(c => !c.isMainCharacter).length || 0} AI NPCs
                        </p>
                        <p className="text-purple-300 text-xs line-clamp-3">
                          {room.collectedScript.background}
                        </p>
                      </div>
                    )}
                    
                    {/* 游戏轮数 */}
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-2">
                        Number Game Rounds {room.collectedScript && '(preconfigured)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={rounds}
                        onChange={(e) => setRounds(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Number Game Rounds（1-30）"
                        autoComplete="off"
                        disabled={!!room.collectedScript}
                      />
                    </div>

                    {/* 剧情要求 */}
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-2">
                        剧情要求 {room.collectedScript && '(preconfigured)'}
                      </label>
                      <textarea
                        value={plotRequirement}
                        onChange={(e) => setPlotRequirement(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        style={{
                          minHeight: '120px',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}
                        rows={6}
                        placeholder="Describe the type of plot you want, background setting, style, etc...."
                        autoComplete="off"
                        spellCheck="false"
                        disabled={!!room.collectedScript}
                      />
                    </div>

                    {/* 开始游戏按钮 */}
                    <button
                      onClick={startGame}
                      disabled={startingGame || (!room.collectedScript && (!plotRequirement.trim() || parseInt(rounds) < 1))}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {startingGame ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {room.collectedScript ? '正在重新开始剧本...' : '正在生成剧本...'}
                        </>
                      ) : (
                        room.collectedScript ? '开始此剧本' : '开始游戏'
                      )}
                    </button>
                  </div>
                )}

                {/* 非房主或游戏中状态 */}
                {(!isHost || room.status !== 'waiting') && room.status !== 'playing' && (
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
                    <div className="text-center">
                      {room.status === 'waiting' ? (
                        <div className="text-white">
                          <h3 className="text-xl font-bold mb-4">Waiting for the homeowner to start the game</h3>
                          <p className="text-slate-300">The homeowner is configuring the game parameters...</p>
                        </div>
                      ) : (
                        <div className="text-white">
                          <h3 className="text-xl font-bold mb-4">Game Over</h3>
                          <p className="text-slate-300">The game is over, thanks for participating!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 简易的好友风格选择器
function FriendStylePicker({ currentUser, onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/users/${currentUser.id}/friend-styles`);
        const data = await res.json();
        if (data.success) setItems(data.friendStyles || []);
      } catch (e) {
        setError('Failed to load friend style');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.id]);

  const [selected, setSelected] = useState([]);

  useEffect(() => { onChange(selected); }, [selected]);

  const toggle = (fs) => {
    const exists = selected.find((s) => s.userId === fs.userId);
    if (exists) {
      setSelected(selected.filter((s) => s.userId !== fs.userId));
    } else {
      setSelected([...selected, { userId: fs.userId, username: fs.username, styleText: fs.recentStyleSample }]);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-medium">Style of AINPC friends (optional)</div>
        <div className="text-xs text-slate-400">Choose to be authorized to your friend's style</div>
      </div>
      {loading ? (
        <div className="text-slate-300 text-sm">loading...</div>
      ) : error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-slate-400 text-sm">No available buddy styles</div>
      ) : (
        <div className="space-y-2">
          {items.map((fs) => {
            const checked = !!selected.find((s) => s.userId === fs.userId);
            return (
              <label key={fs.userId} className={`block p-3 rounded border ${checked ? 'border-purple-400 bg-purple-600/20' : 'border-slate-600 bg-slate-700/40'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm">style of {fs.username}</div>
                    {fs.recentStyleSample && (
                      <div className="text-slate-300 text-xs mt-1 line-clamp-2">{fs.recentStyleSample}</div>
                    )}
                  </div>
                  <input type="checkbox" className="w-4 h-4" checked={checked} onChange={() => toggle(fs)} />
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
