import { useState } from 'react';
import { formatCurrency } from '../utils/format';
import { useConfirm } from './ConfirmDialog';

const GOAL_COLORS = {
  primary: { bg: 'bg-primary-500', light: 'bg-primary-100' },
  green: { bg: 'bg-green-500', light: 'bg-green-100' },
  blue: { bg: 'bg-blue-500', light: 'bg-blue-100' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-100' },
  pink: { bg: 'bg-pink-500', light: 'bg-pink-100' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-100' },
};

export default function SavingsGoalsCard({ goals = [], accounts = [], onUpdate }) {
  const confirm = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({ name: '', targetAmount: '', currentAmount: '0', targetDate: '', color: 'primary', linkedAccountId: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // Filter to only savings accounts
  const savingsAccounts = accounts.filter(a => a.type === 'savings');

  const openAddGoal = () => {
    setEditingGoal(null);
    setFormData({ name: '', targetAmount: '', currentAmount: '0', targetDate: '', color: 'primary', linkedAccountId: '' });
    setFormOpen(true);
  };

  const openEditGoal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate || '',
      color: goal.color || 'primary',
      linkedAccountId: goal.linkedAccountId || '',
    });
    setFormOpen(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const { createGoal, updateGoal } = await import('../services/api');
      const payload = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate || null,
        color: formData.color,
        linkedAccountId: formData.linkedAccountId || null,
      };

      // Only include currentAmount if not linked to an account
      if (!formData.linkedAccountId) {
        payload.currentAmount = parseFloat(formData.currentAmount) || 0;
      }

      if (editingGoal) {
        await updateGoal(editingGoal.id, payload);
      } else {
        await createGoal(payload);
      }
      setFormOpen(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteGoal = async (goal) => {
    const confirmed = await confirm({
      title: 'Delete Goal',
      message: `Delete "${goal.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      const { deleteGoal } = await import('../services/api');
      await deleteGoal(goal.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleContribute = async (goal) => {
    const amount = parseFloat(contributeAmount);
    if (!amount) return;
    try {
      const { contributeToGoal } = await import('../services/api');
      await contributeToGoal(goal.id, amount);
      setContributeOpen(null);
      setContributeAmount('');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Failed to contribute: ' + err.message);
    }
  };

  // Get account name by ID
  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const activeGoals = goals.filter(g => !g.isCompleted);
  const completedGoals = goals.filter(g => g.isCompleted);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Savings Goals</h3>
        <button onClick={openAddGoal} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          + Add Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No savings goals yet. Set a goal to track your progress!
        </p>
      ) : (
        <div className="space-y-4">
          {activeGoals.map((goal) => {
            const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const colors = GOAL_COLORS[goal.color] || GOAL_COLORS.primary;
            const isLinked = !!goal.linkedAccountId;
            
            return (
              <div key={goal.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{goal.name}</h4>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                    </p>
                    {isLinked && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        🔗 Linked to {getAccountName(goal.linkedAccountId)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{percentage}%</span>
                </div>
                
                {/* Progress bar */}
                <div className={`h-2 ${colors.light} rounded-full overflow-hidden mb-2`}>
                  <div className={`h-full ${colors.bg} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-between">
                  {!isLinked && contributeOpen === goal.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          className="input py-1 pl-6 text-sm"
                          placeholder="0"
                          value={contributeAmount}
                          onChange={(e) => setContributeAmount(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <button onClick={() => handleContribute(goal)} className="btn-primary py-1 px-3 text-sm">Add</button>
                      <button onClick={() => { setContributeOpen(null); setContributeAmount(''); }} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  ) : (
                    <>
                      {isLinked ? (
                        <span className="text-xs text-gray-400">Transfer to savings account to contribute</span>
                      ) : (
                        <button onClick={() => setContributeOpen(goal.id)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                          + Contribute
                        </button>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <button onClick={() => openEditGoal(goal)} className="text-gray-500 hover:text-gray-700">Edit</button>
                        <button onClick={() => handleDeleteGoal(goal)} className="text-red-500 hover:text-red-700">Delete</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Completed goals */}
          {completedGoals.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Completed 🎉</p>
              {completedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between py-2 text-sm text-gray-500">
                  <span className="line-through">{goal.name}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(goal.targetAmount)}</span>
                    <button onClick={() => handleDeleteGoal(goal)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goal Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <h2 className="text-lg font-semibold mb-4">{editingGoal ? 'Edit Goal' : 'New Savings Goal'}</h2>
            <form onSubmit={handleSaveGoal}>
              <div className="mb-4">
                <label className="label">Goal Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Emergency Fund, Vacation, etc."
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="label">Target Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    className="input pl-7"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="1000"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Link to Savings Account */}
              {savingsAccounts.length > 0 && (
                <div className="mb-4">
                  <label className="label">
                    Link to Savings Account <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    className="input"
                    value={formData.linkedAccountId}
                    onChange={(e) => setFormData({ ...formData, linkedAccountId: e.target.value, currentAmount: '0' })}
                  >
                    <option value="">Don't link - track manually</option>
                    {savingsAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.currentBalance)})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.linkedAccountId 
                      ? "Progress will automatically update when you transfer to this account" 
                      : "You'll manually track progress with contributions"}
                  </p>
                </div>
              )}
              
              {/* Only show current progress if not linked */}
              {!formData.linkedAccountId && (
                <div className="mb-4">
                  <label className="label">Current Progress</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      className="input pl-7"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                      placeholder="0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <label className="label">Target Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  className="input"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                />
              </div>
              
              <div className="mb-6">
                <label className="label">Color</label>
                <div className="flex gap-2">
                  {Object.keys(GOAL_COLORS).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full ${GOAL_COLORS[color].bg} ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={formLoading}>
                  {formLoading ? 'Saving...' : editingGoal ? 'Save' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
