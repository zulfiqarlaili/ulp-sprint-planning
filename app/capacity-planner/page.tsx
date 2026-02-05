"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TEAM_MEMBERS_CONFIG, CONSTANTS, Role } from "@/lib/capacity-constants";
import { getConfig, getCurrentSprintIndex, getSprintNumber, formatSprintRelease } from "@/lib/sprint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { pb } from "@/lib/pocketbase";
import { Loader2, Save, Lock, Unlock, Plus, History, PlayCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TeamMemberState = {
    name: string;
    role: Role;
    leaveDays: number;
    publicHolidayDays: number;
    fullCapacityPoints: number;
    id?: string;
};

type SprintRecord = {
    id: string;
    name: string;
    created: string;
};

// Calculate current sprint number based on date
const calculateCurrentSprintName = () => {
    try {
        const config = getConfig();
        const currentIndex = getCurrentSprintIndex(config);
        const sprintNum = getSprintNumber(config, currentIndex);
        // Format as "1.195.0" - parse the float and add .0
        const formatted = formatSprintRelease(sprintNum); // e.g. "1.195"
        return `Sprint ${formatted}.0`;
    } catch (e) {
        console.error("Failed to calculate sprint number:", e);
        return "Sprint 1.195.0"; // Fallback to correct format
    }
};

function CapacityPlannerContent() {
    const searchParams = useSearchParams();
    const [sprintId, setSprintId] = useState<string | null>(null);
    const [sprintName, setSprintName] = useState(calculateCurrentSprintName());
    const [sprintStatus, setSprintStatus] = useState<string>("planned");
    const [sprintHistory, setSprintHistory] = useState<SprintRecord[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showNewSprintDialog, setShowNewSprintDialog] = useState(false);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);

    // Team State
    const [members, setMembers] = useState<TeamMemberState[]>([]);

    // New Member State
    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberRole, setNewMemberRole] = useState<Role>("Engineer");

    // Params
    const [leadEffortHours, setLeadEffortHours] = useState(8);
    const [supportEffortHours, setSupportEffortHours] = useState(8);

    const [releaseEffortPoints, setReleaseEffortPoints] = useState(0);
    const [leadEffortPointsInput, setLeadEffortPointsInput] = useState(2);
    const [supportEffortPointsInput, setSupportEffortPointsInput] = useState(0);

    const [devCapacityFactorPercent, setDevCapacityFactorPercent] = useState(CONSTANTS.DEV_CAPACITY_FACTOR * 100);
    const [qaCapacityFactorPercent, setQaCapacityFactorPercent] = useState(CONSTANTS.QA_CAPACITY_FACTOR * 100);

    // Load Sprint Data
    const loadSprintData = async (targetSprintId?: string) => {
        setIsLoading(true);
        try {
            // 1. Fetch History List (Always refresh history to catch new additions)
            const historyResult = await pb.collection('sprints').getList(1, 50, {
                sort: '-created',
            });
            const history = historyResult.items.map(i => ({ id: i.id, name: i.name, created: i.created }));
            setSprintHistory(history);

            // 2. Determine which sprint to load
            let sprint = null;
            if (targetSprintId) {
                // Fetch specific sprint
                sprint = await pb.collection('sprints').getOne(targetSprintId);
            } else if (historyResult.items.length > 0) {
                // Default to latest
                sprint = historyResult.items[0];
            }

            if (sprint) {
                setSprintId(sprint.id);
                setSprintName(sprint.name);
                setSprintStatus(sprint.status || "planned");

                setLeadEffortHours(sprint.lead_effort_hours || 8);
                setSupportEffortHours(sprint.support_effort_hours || 8);
                setReleaseEffortPoints(sprint.release_effort_points || 0);
                setLeadEffortPointsInput(sprint.lead_effort_points_input || 2);
                setSupportEffortPointsInput(sprint.support_effort_points_input || 0);
                setDevCapacityFactorPercent(sprint.dev_capacity_factor || CONSTANTS.DEV_CAPACITY_FACTOR * 100);
                setQaCapacityFactorPercent(sprint.qa_capacity_factor || CONSTANTS.QA_CAPACITY_FACTOR * 100);

                const caps = await pb.collection('capacities').getFullList({
                    filter: `sprint="${sprint.id}"`
                });

                // Union Members logic
                const allNames = new Set([
                    ...TEAM_MEMBERS_CONFIG.map(m => m.name),
                    ...caps.map(c => c.name)
                ]);

                const mergedMembers: TeamMemberState[] = [];

                allNames.forEach(name => {
                    const dbRecord = caps.find(c => c.name === name);
                    const configRecord = TEAM_MEMBERS_CONFIG.find(c => c.name === name);
                    const role = (dbRecord?.role as Role) || (configRecord?.role as Role) || 'Engineer';

                    mergedMembers.push({
                        name: name,
                        role: role,
                        leaveDays: dbRecord?.leave_days || 0,
                        publicHolidayDays: dbRecord?.public_holiday_days || 0,
                        fullCapacityPoints: dbRecord?.full_capacity_points || 20,
                        id: dbRecord?.id
                    });
                });

                setMembers(mergedMembers);
            } else {
                // Fallback init
                const initialMembers = TEAM_MEMBERS_CONFIG.map(m => ({
                    name: m.name,
                    role: m.role as Role,
                    leaveDays: 0,
                    publicHolidayDays: 0,
                    fullCapacityPoints: 20
                }));
                setMembers(initialMembers);
            }
        } catch (err) {
            console.error("Failed to load sprint data:", err);
            alert("Error loading data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const urlSprintId = searchParams.get('sprintId');
        if (urlSprintId) {
            loadSprintData(urlSprintId);
        } else {
            loadData();
        }
    }, [searchParams]);

    // Wrapper for initial call to match useEffect signature
    const loadData = () => loadSprintData();


    // Save Data
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const sprintData = {
                name: sprintName,
                status: sprintStatus,
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                lead_effort_hours: leadEffortHours,
                support_effort_hours: supportEffortHours,
                release_effort_points: releaseEffortPoints,
                lead_effort_points_input: leadEffortPointsInput,
                support_effort_points_input: supportEffortPointsInput,
                dev_capacity_factor: devCapacityFactorPercent,
                qa_capacity_factor: qaCapacityFactorPercent
            };

            let currentSprintId = sprintId;

            if (currentSprintId) {
                await pb.collection('sprints').update(currentSprintId, sprintData);
            } else {
                const rec = await pb.collection('sprints').create(sprintData);
                currentSprintId = rec.id;
                setSprintId(rec.id);
            }

            await Promise.all(members.map(async (m) => {
                const capData = {
                    sprint: currentSprintId,
                    name: m.name,
                    role: m.role,
                    leave_days: m.leaveDays,
                    public_holiday_days: m.publicHolidayDays,
                    full_capacity_points: m.fullCapacityPoints,
                    working_days: 10 - m.leaveDays - m.publicHolidayDays,
                };

                if (m.id) {
                    await pb.collection('capacities').update(m.id, capData);
                } else {
                    await pb.collection('capacities').create(capData);
                }
            }));

            alert("Saved successfully!");
            // Refresh purely to ensure IDs are synced if we created new stuff, though we're mostly updating here.
            loadSprintData(currentSprintId!);

        } catch (err) {
            console.error("Error saving:", err);
            alert("Failed to save.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleNewSprint = () => {
        setShowNewSprintDialog(true);
    };

    const confirmNewSprint = async () => {
        setShowNewSprintDialog(false);
        setIsSaving(true);
        try {
            // 1. Calculate new version
            // Support both "1.194" and "1.194.0" formats
            const versionMatch = sprintName.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
            let nextName = "Sprint Next";

            if (versionMatch) {
                const major = parseInt(versionMatch[1]);
                const minor = parseInt(versionMatch[2]);
                const patch = versionMatch[3] ? parseInt(versionMatch[3]) : 0;
                const nextMinor = minor + 1;
                nextName = `Sprint ${major}.${nextMinor}.${patch}`;
            } else {
                nextName = `${sprintName} (Next)`;
            }

            // 2. Update Current Sprint to FINISHED
            if (sprintId) {
                await pb.collection('sprints').update(sprintId, {
                    status: 'finished'
                });
            }

            // 3. Create Sprint Record (Active)
            const sprintData = {
                name: nextName,
                status: 'active',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                // Copy settings from current state
                lead_effort_hours: leadEffortHours,
                support_effort_hours: supportEffortHours,
                release_effort_points: releaseEffortPoints,
                lead_effort_points_input: leadEffortPointsInput,
                support_effort_points_input: supportEffortPointsInput,
                dev_capacity_factor: devCapacityFactorPercent,
                qa_capacity_factor: qaCapacityFactorPercent
            };
            const newSprint = await pb.collection('sprints').create(sprintData);

            // 3. Clone Members (Resetting Leaves)
            await Promise.all(members.map(async (m) => {
                const capData = {
                    sprint: newSprint.id, // Link to NEW sprint
                    name: m.name,
                    role: m.role,
                    leave_days: 0, // Reset
                    public_holiday_days: 0, // Reset
                    full_capacity_points: m.fullCapacityPoints, // Keep full capacity
                    working_days: 10,
                };
                await pb.collection('capacities').create(capData);
            }));

            alert(`Started ${nextName}!`);
            // Load the NEW sprint
            loadSprintData(newSprint.id);

        } catch (e) {
            console.error(e);
            alert("Failed to start new sprint.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddMember = () => {
        if (!newMemberName.trim()) return;
        setMembers(prev => [
            ...prev,
            {
                name: newMemberName,
                role: newMemberRole,
                leaveDays: 0,
                publicHolidayDays: 0,
                fullCapacityPoints: 20
            }
        ]);
        setNewMemberName("");
    };

    // Shared Overhead Calculations
    const leadEffortPoints = leadEffortHours * CONSTANTS.HOURS_TO_POINTS;
    const supportEffortPoints = supportEffortHours * CONSTANTS.HOURS_TO_POINTS;
    const totalSharedDeductionPoints = leadEffortPoints + supportEffortPoints;

    // Header Calculations
    const calculatedMembers = useMemo(() => {
        return members.map(m => {
            const leavePoints = m.leaveDays * CONSTANTS.DAYS_TO_POINTS;
            const phPoints = m.publicHolidayDays * CONSTANTS.DAYS_TO_POINTS;
            const deduction = leavePoints + phPoints + totalSharedDeductionPoints;

            let currentCapacity = m.fullCapacityPoints - deduction;
            if (currentCapacity < 0) currentCapacity = 0;

            return {
                ...m,
                currentCapacity
            };
        });
    }, [members, totalSharedDeductionPoints]);

    const updateMember = (index: number, field: keyof TeamMemberState, value: number) => {
        setMembers(prev => {
            const newMembers = [...prev];
            newMembers[index] = { ...newMembers[index], [field]: value };
            return newMembers;
        });
    };

    const leftSideTotal = releaseEffortPoints + leadEffortPointsInput + supportEffortPointsInput;
    const rightSideTotal = totalSharedDeductionPoints;
    const teamEffortTotal = leftSideTotal + rightSideTotal;

    const devMembers = calculatedMembers.filter(m => m.role === 'Engineer');
    const qaMembers = calculatedMembers.filter(m => m.role === 'QA');

    const sumDevCurrentCapacity = devMembers.reduce((acc, m) => acc + m.currentCapacity, 0);
    const sumQACurrentCapacity = qaMembers.reduce((acc, m) => acc + m.currentCapacity, 0);

    const currentDevCapacity = sumDevCurrentCapacity - teamEffortTotal;
    const minSprintCapacityDev = currentDevCapacity * (devCapacityFactorPercent / 100);
    const minSprintCapacityQA = sumQACurrentCapacity * (qaCapacityFactorPercent / 100);

    const totalPlannedCapacity = minSprintCapacityDev + minSprintCapacityQA;
    const maxPlannedCapacity = totalPlannedCapacity * CONSTANTS.BUFFER_FACTOR;
    const codeFreezeCommitment = totalPlannedCapacity * CONSTANTS.CODE_FREEZE_FACTOR;

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin mr-2" /> Loading Planner...</div>;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:justify-between md:items-center">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center min-w-0">
                    <div
                        className={`flex items-center gap-2 select-none ${sprintStatus === 'finished' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        onDoubleClick={() => {
                            if (sprintStatus !== 'finished') {
                                setIsEditMode(prev => !prev);
                            }
                        }}
                        title={sprintStatus === 'finished' ? "Sprint is Finished (Read-Only)" : "Double click to toggle Edit Mode"}
                    >
                        <h1 className="text-3xl font-bold">Planner</h1>
                        {sprintStatus === 'finished' ? (
                            <div className="flex items-center text-slate-500 text-sm font-medium border border-slate-300 rounded px-2 py-0.5 bg-slate-100">
                                <Lock className="w-3 h-3 mr-1" /> Finished
                            </div>
                        ) : (
                            isEditMode ? <Unlock className="w-5 h-5 text-green-600" /> : <Lock className="w-5 h-5 text-slate-400" />
                        )}
                    </div>

                    {/* Sprint Selector */}
                    <Select value={sprintId || ""} onValueChange={(val) => loadSprintData(val)}>
                        <SelectTrigger className="w-full md:w-[280px] text-lg font-medium min-w-0">
                            <SelectValue placeholder="Select Sprint" />
                        </SelectTrigger>
                        <SelectContent>
                            {sprintHistory.map(h => (
                                <SelectItem key={h.id} value={h.id}>
                                    {h.name} <span className="text-xs text-muted-foreground ml-2">({new Date(h.created).toLocaleDateString()})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                    {isEditMode && (
                        <>
                            <Button variant="outline" onClick={handleNewSprint} disabled={isSaving} className="border-blue-200 text-blue-700 hover:bg-blue-50 min-h-[44px]">
                                <PlayCircle className="mr-2 h-4 w-4" /> Start Next Sprint
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="min-h-[44px]">
                                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Team: cards on mobile, table on desktop */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Capacity ({sprintName})</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Mobile: card per member */}
                    <div className="md:hidden space-y-4">
                        {calculatedMembers.map((m, idx) => (
                            <div key={m.name} className="rounded-md border p-4 space-y-3">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-medium">{m.name}</span>
                                    <span className="text-sm text-muted-foreground">{m.role}</span>
                                </div>
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <dt className="text-muted-foreground">Leave (Days)</dt>
                                        <dd>
                                            <Input
                                                type="number"
                                                className="w-full max-w-[80px]"
                                                min={0}
                                                value={m.leaveDays}
                                                disabled={!isEditMode}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMember(idx, 'leaveDays', parseFloat(e.target.value) || 0)}
                                            />
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Public Holiday (Days)</dt>
                                        <dd>
                                            <Input
                                                type="number"
                                                className="w-full max-w-[80px]"
                                                min={0}
                                                value={m.publicHolidayDays}
                                                disabled={!isEditMode}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMember(idx, 'publicHolidayDays', parseFloat(e.target.value) || 0)}
                                            />
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Full Capacity (Points)</dt>
                                        <dd>
                                            <Input
                                                type="number"
                                                className="w-full max-w-[80px]"
                                                min={0}
                                                value={m.fullCapacityPoints}
                                                disabled={!isEditMode}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMember(idx, 'fullCapacityPoints', parseFloat(e.target.value) || 0)}
                                            />
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Net Capacity (Points)</dt>
                                        <dd className={`font-bold ${m.currentCapacity < 10 ? 'text-red-500' : 'text-green-600'}`}>
                                            {m.currentCapacity.toFixed(1)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Leave (Days)</TableHead>
                                    <TableHead>Public Holiday (Days)</TableHead>
                                    <TableHead>Full Capacity (Points)</TableHead>
                                    <TableHead className="text-right">Net Capacity (Points)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calculatedMembers.map((m, idx) => (
                                    <TableRow key={m.name}>
                                        <TableCell className="font-medium">{m.name}</TableCell>
                                        <TableCell>{m.role}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="w-20"
                                                min={0}
                                                value={m.leaveDays}
                                                disabled={!isEditMode}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMember(idx, 'leaveDays', parseFloat(e.target.value) || 0)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="w-20"
                                                min={0}
                                                value={m.publicHolidayDays}
                                                disabled={!isEditMode}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMember(idx, 'publicHolidayDays', parseFloat(e.target.value) || 0)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="w-20"
                                                min={0}
                                                value={m.fullCapacityPoints}
                                                disabled={!isEditMode}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMember(idx, 'fullCapacityPoints', parseFloat(e.target.value) || 0)}
                                            />
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${m.currentCapacity < 10 ? 'text-red-500' : 'text-green-600'}`}>
                                            {m.currentCapacity.toFixed(1)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {isEditMode && (
                        <div className="mt-6 p-4 border rounded bg-slate-50 flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
                            <div className="grid w-full sm:max-w-sm items-center gap-1.5">
                                <Label htmlFor="new-name">New Member Name</Label>
                                <Input
                                    id="new-name"
                                    placeholder="e.g. Alice"
                                    value={newMemberName}
                                    onChange={e => setNewMemberName(e.target.value)}
                                />
                            </div>
                            <div className="grid w-full sm:max-w-xs items-center gap-1.5">
                                <Label htmlFor="new-role">Role</Label>
                                <select
                                    id="new-role"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newMemberRole}
                                    onChange={e => setNewMemberRole(e.target.value as Role)}
                                >
                                    <option value="Engineer">Engineer</option>
                                    <option value="QA">QA</option>
                                </select>
                            </div>
                            <Button variant="secondary" onClick={handleAddMember} className="min-h-[44px]">
                                <Plus className="w-4 h-4 mr-2" /> Add Member
                            </Button>
                        </div>
                    )}

                    <div className="mt-4 text-sm text-muted-foreground bg-yellow-50 p-2 rounded">
                        Note: Net Capacity = Full - (Leave + PH)*2 - RightSideOverhead({rightSideTotal}).
                    </div>
                </CardContent>
            </Card>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${!isEditMode ? 'opacity-80' : ''}`}>
                {/* Overhead Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sprint Effort & Overhead</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Right Side (Shared - Hours)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Meeting Hours (Team)</Label>
                                    <Input
                                        type="number"
                                        value={leadEffortHours}
                                        disabled={!isEditMode}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadEffortHours(parseFloat(e.target.value) || 0)}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">({leadEffortPoints} points)</p>
                                </div>
                                <div>
                                    <Label>Support Hours (Team)</Label>
                                    <Input
                                        type="number"
                                        value={supportEffortHours}
                                        disabled={!isEditMode}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupportEffortHours(parseFloat(e.target.value) || 0)}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">({supportEffortPoints} points)</p>
                                </div>
                            </div>
                            <div className="text-right text-sm font-bold">Total Right Side: {rightSideTotal} points</div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Left Side (Specific - Points)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <Label>Release Effort</Label>
                                    <Input
                                        type="number"
                                        value={releaseEffortPoints}
                                        disabled={!isEditMode}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReleaseEffortPoints(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <Label>Lead Effort</Label>
                                    <Input
                                        type="number"
                                        value={leadEffortPointsInput}
                                        disabled={!isEditMode}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadEffortPointsInput(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <Label>Support Effort</Label>
                                    <Input
                                        type="number"
                                        value={supportEffortPointsInput}
                                        disabled={!isEditMode}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupportEffortPointsInput(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="text-right text-sm font-bold">Total Left Side: {leftSideTotal} points</div>
                        </div>

                        <div className="bg-slate-100 p-4 rounded text-center">
                            <span className="font-bold text-lg">Total Team Effort Deduction: {teamEffortTotal} points</span>
                            <p className="text-xs text-muted-foreground">(Subtracted from Total Dev Capacity)</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Final Summary */}
                <Card className="bg-slate-50 border-2 border-slate-200">
                    <CardHeader>
                        <CardTitle>Sprint Capacity Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Sum Dev Net Capacity:</div>
                            <div className="text-right">{sumDevCurrentCapacity.toFixed(1)}</div>

                            <div>Minus Team Effort:</div>
                            <div className="text-right text-red-500">-{teamEffortTotal.toFixed(1)}</div>

                            <div className="font-bold border-t pt-2">Current Dev Capacity:</div>
                            <div className="text-right font-bold border-t pt-2">{currentDevCapacity.toFixed(1)}</div>

                            <div className="flex items-center gap-2">
                                <span>Working Capacity (%):</span>
                                <Input
                                    type="number"
                                    className="w-16 h-6 px-1 text-right inline-block"
                                    value={devCapacityFactorPercent}
                                    disabled={!isEditMode}
                                    step={1}
                                    max={100}
                                    min={10}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDevCapacityFactorPercent(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="text-right text-blue-600 font-bold">{minSprintCapacityDev.toFixed(1)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm border-t pt-4">
                            <div>Sum QA Net Capacity:</div>
                            <div className="text-right">{sumQACurrentCapacity.toFixed(1)}</div>
                            <div className="flex items-center gap-2">
                                <span>Working Capacity (%):</span>
                                <Input
                                    type="number"
                                    className="w-16 h-6 px-1 text-right inline-block"
                                    value={qaCapacityFactorPercent}
                                    disabled={!isEditMode}
                                    step={1}
                                    max={100}
                                    min={10}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQaCapacityFactorPercent(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="text-right text-blue-600 font-bold">{minSprintCapacityQA.toFixed(1)}</div>
                        </div>

                        <div className="bg-white p-4 rounded shadow-sm border border-slate-200 mt-4">
                            <div className="text-center">
                                <div className="text-sm text-slate-500 uppercase tracking-wide">Total Planned Capacity</div>
                                <div className="text-4xl font-extrabold text-blue-700 my-2">{totalPlannedCapacity.toFixed(1)}</div>
                                <div className="text-xs text-slate-400">Points</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                                <div>
                                    <div className="text-xs text-slate-500">Max Capacity (120%)</div>
                                    <div className="font-bold">{maxPlannedCapacity.toFixed(1)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">Code Freeze (80%)</div>
                                    <div className="font-bold">{codeFreezeCommitment.toFixed(1)}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={showNewSprintDialog} onOpenChange={setShowNewSprintDialog}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Start Next Sprint?</DialogTitle>
                        <DialogDescription>
                            This will create a new sprint and copy your current team members. Leave days and public holidays will be reset to 0.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewSprintDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmNewSprint} disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            {isSaving ? "Creating..." : "Start Sprint"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function CapacityPlanner() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin mr-2" /> Loading Planner...</div>}>
            <CapacityPlannerContent />
        </Suspense>
    );
}
